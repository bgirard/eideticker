# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import optparse

class OptionParser(optparse.OptionParser):
    '''Custom version of the optionparser class with a few eideticker-specific
       parameters to set device information'''

    def __init__(self, **kwargs):
        optparse.OptionParser.__init__(self, **kwargs)
        self.add_option("--host", action="store",
                        type = "string", dest = "host",
                        help = "Device hostname (only if using TCP/IP)", default=None)
        self.add_option("-p", "--port", action="store",
                        type = "int", dest = "port",
                        help = "Custom device port (if using SUTAgent or "
                        "adb-over-tcp)", default=None)
        self.add_option("-m", "--dm-type", action="store",
                        type = "string", dest = "dmtype",
                        help = "DeviceManager type (adb or sut, defaults to adb)")

