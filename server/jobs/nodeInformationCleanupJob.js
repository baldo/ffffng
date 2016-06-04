'use strict';

angular.module('ffffng').factory('NodeInformationCleanupJob', function (MonitoringService, Logger) {
    return {
        run: function (callback) {
            MonitoringService.cleanupNodeInformation(function (err) {
                if (err) {
                    Logger.tag('monitoring', 'information-cleanup').error('Error cleaning up node data:', err);
                }

                callback();
            });
        }
    };
});