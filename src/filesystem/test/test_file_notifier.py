# Copyright (c) 2006 ActiveState Software Inc.
# See the file LICENSE.txt for licensing information.

# test_file_notifier.py:
#   Command line module to test/demonstrate the file notification system.
#
# Example usage:
#   python test_file_notifier.py -w <file_path> -p
#   python test_file_notifier.py -r <file_path> -o
#
# Contributors:
# * Todd Whiteman
#

import os
import sys
import logging
import stat
from optparse import OptionParser

import osFilePollingNotifier
import test_koFileNotifications
from osFileNotificationUtils import *

def get_notification_service(notifications_type, log):
    # Determine which platform to use for OS level file notifications
    if notifications_type == test_koFileNotifications.TYPE_POLLING:
        import osFilePollingNotifier
        log.info("Setting up file polling service")
        FWS = osFilePollingNotifier.osFilePollingNotifier
    elif sys.platform.startswith("win"):
        # Windows
        log.info("Setting up OS File Notifications for Windows")
        import osFileNotifications_win32
        FWS = osFileNotifications_win32.WindowsFileWatcherService
        osFileNotifications_win32.log = log
    elif sys.platform.startswith("darwin") or sys.platform.startswith("mac"):
        # Apple
        log.info("Setting up OS File Notifications for Apple")
        from osFileNotifications_darwin import DarwinFileWatcherService as FWS
        self.__os_file_service = DarwinFileWatcherService(log)
    elif sys.platform.startswith("linux") or \
         sys.platform.startswith("sunos") or \
         sys.platform.startswith("solaris"):
        # Unix
        # XXX - Any others here ??
        log.info("Setting up OS File Notifications for Unix")
        from osFileNotifications_unix import UnixFileWatcherService as FWS
    else:
        log.warn("Unknown platform: %s", sys.platform)
        # Raise exception then
        raise "Unknown platform: %s" % sys.platform
    return FWS()

class Usage(Exception):
    def __init__(self, msg):
        self.msg = msg

def addPaths(poller, observer, paths, recursive=False):
    for path in paths:
        try:
            path = os.path.abspath(path)
            st = os.stat(path)
            if stat.S_ISDIR(st.st_mode):
                if recursive:
                    poller.addObserver(observer, path, WATCH_DIR_RECURSIVE, FS_NOTIFY_ALL)
                else:
                    poller.addObserver(observer, path, WATCH_DIR, FS_NOTIFY_ALL)
            elif stat.S_ISREG(st.st_mode):
                poller.addObserver(observer, path, WATCH_FILE, FS_NOTIFY_ALL)
            else:
                print "Path is not a file or directory: %s" % (path)
        except OSError:
            print "Path does exist: %s" % (path)

# Main function
def mainHandler(opts, args):
    # Setup logging
    log = test_koFileNotifications.test_setupDummyLogger("test_poller")
    #log.setLevel(logging.DEBUG)
    log.setLevel(logging.INFO)
    osFilePollingNotifier.log = log
    test_koFileNotifications.log = log
    # Setup the polling service
    if opts.os_notifications:
        service_type = test_koFileNotifications.TYPE_OS_NOTIFICATIONS
    else:
        service_type = test_koFileNotifications.TYPE_POLLING
    service = get_notification_service(service_type, log)
    service.startNotificationService()
    # Create an observer and add observed paths
    observer = test_koFileNotifications._test_koIFileNotificationObserver(service)
    if opts.watch_path:
        addPaths(service, observer, opts.watch_path, recursive=False)
    if opts.watch_recursive_path:
        addPaths(service, observer, opts.watch_recursive_path, recursive=True)
    try:
        try:
            while service.number_of_observed_locations > 0:
                observer.wait()
                observer.dump()
                observer.clear()
        except KeyboardInterrupt:
            print "Shutting down"
        #print observer.notifications()
    finally:
        service.stopNotificationService()

def main(argv=None):
    if argv is None:
        argv = sys.argv
    parser = OptionParser()
    parser.add_option("-w", "--watch", dest="watch_path",
                      action="append", type="string", help="The path to watch")
    parser.add_option("-r", "--watch-recursive", dest="watch_recursive_path",
                      action="append", type="string", help="The path to watch recursively")
    parser.add_option("-p", "--polling", dest="os_notifications",
                      action="store_false", help="Use polling service for notifications")
    parser.add_option("-o", "--os-notifications", dest="os_notifications",
                      action="store_true", help="Use os notification service for notifications")
    parser.add_option("-v", "--verbose", dest="verbose",
                      action="store_true", help="Verbose information on what is happening")
    parser.add_option("-d", "--debug-level", dest="debug_level",
                      action="store", type="int", help="Level of debugging output")
    (opts, args) = parser.parse_args()
    #print "opts:", opts
    #print "args:", args
    mainHandler(opts, args)

# When run from command line
if __name__ == "__main__":
    sys.exit(main())
