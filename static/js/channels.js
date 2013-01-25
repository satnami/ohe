/*globals angular */

(function () {
    angular.module('channels', ['messages', 'users', 'ui', 'channelState', 'utils']).config(function ($routeProvider) {
        $routeProvider.when('/', {
            controller: 'ChannelListCtrl',
            templateUrl: '/static/templates/channel-list.html',
            selectedNav: 'inbox'
        }).when('/channel/:channel_id', {
            template: '<channel-detail></channel-detail>'
        });
    }).directive('channelDetail', function ($timeout) {
        return {
            restrict: 'E',
            controller: 'ChannelDetailCtrl',
            templateUrl: '/static/templates/channel-detail.html'
        };
    }).factory('Channel', function ($q, $rootScope, $http, User, Message) {
        var Channel = function (data, batch) {
            if (data) {
                this.update(data, batch);
            }

            this.messages = [];
        };

        Channel.prototype.update = function (data, batch) {
            angular.extend(this, data);
            this.owner = User.update(data.owner);
            this.users = _.values(User.bulk_get(this.get_user_ids(), !batch));
        };

        Channel.prototype.detail_url = function () {
            return '/channel/' + this.id;
        };

        Channel.prototype.get_users = function (include_viewer) {
            return [];
            var users;
            if (include_viewer) {
                users = this.users;
            } else {
                users = _.reject(this.users, function (sub) {
                    return sub.id === $rootScope.user_id;
                });
            }

            // if recent_message is supplied, have that user name at the beginning of the list
            var recent_message = this.recent_message;
            if (recent_message && recent_message.user.id !== $rootScope.user_id) {
                users = _.reject(users, function (sub) {
                    return sub.id === recent_message.user.id;
                });
                users.unshift(recent_message.user);
            }

            return users;
        };

        Channel.prototype.get_user_ids = function () {
            return _.union([this.owner.id], this.writers.user_ids);
        }

        return Channel;
    }).controller('ChannelListCtrl', function ($scope, $location, Channel, Message, channelState, utils) {
        $scope.has_more_channels = true;
        $scope.channel_fetch_size = 10;

        channelState.query_channels($scope.channel_fetch_size, false).then(function () {
            $scope.$watch('channel_list', function (newVal, oldVal) {
                if (newVal !== oldVal) {
                    utils.title_bar_notification();
                }
            }, true);
        });

        $scope.selectedUsers = [];
        $scope.message = "";

        $scope.createUser = function () {
            Message.auto_create(_.pluck($scope.selectedUsers, 'id'), $scope.message).then(function (channel_id) {
                if (channel_id) {
                    $location.path('/channel/' + channel_id);
                }
            });
        };

        $scope.loadOlderChannels = function () {
            channelState.query_channels($scope.channel_fetch_size, true).then(function (channels) {
                if (channels.length < $scope.channel_fetch_size) {
                    $scope.has_more_channels = false;
                }
            });
        };

    }).controller('ChannelDetailCtrl', function ($scope, $element, $timeout, channelState, $routeParams) {
        channelState.get_channel($routeParams.channel_id, true).then(function (channel) {
            $scope.channel = channel;
            // messages are also loaded at this point
            $scope.$broadcast('channel_loaded');
        });
    });
})();
