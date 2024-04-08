# Common Issues
- gphoto2 error, **Error (-53: 'Could not claim the USB device')**
    1. In terminal, run the command `ps -A`
    2. Find the program under the name `gvfsd-gphoto2`, copy its pid (the 4-5 digit number next to the name).
    3. Run `kill {pid}`.
        > For example, if the pid of `gvfsd-gphoto2` was `89428`, I would run `kill 89428`.
    4. Attempt the program again.
- Pi won't connect to internet (How to get to the Pi Desktop remotely)
    1. Verify internet status, run `ping 8.8.8.8` (Google DNS) in the Pi's terminal.
    
    ### Steps 2-11 are for getting to the GUI of the Pi. If you are confident in terminal / Pi is already connected to another WiFi, skip to 12
    2. (Windows) In the computer the ethernet adapter is connected to, go to `Network and Internet Settings`
    3. Go to `Advanced network settings`
    4. Locate the ethernet adapter (should be called ASIX USB to Ethernet Adapter). Expand it.
    5. Click view additional properties / edit. 
    6. Click edit next to IP Assignment. Switch `IPv4` toggle to on.
        > If automatic, switch to manual. 
    7. In the `IP Address` field, assign an ip between `192.168.2.2-255`
        > I recommend just `192.168.2.2`
    8. Under subnet mask, put `255.255.255.0`. Hit save.
    9. Download RealVNC [https://www.realvnc.com/en/connect/download/viewer/]
    10. In RealVNC, go to `File -> New Connection`, in the VNC Server box, put `192.168.2.1`.
        > You can add a name to it as well in the box below. The Pi is called `clarkepi`.
    11. Attempt to connect. Should bring up the Pi desktop where you can manually configure the WiFi with UI.

    12. If the Pi is connected to WiFi, but downloads still aren't working, the problem is most likely in routing.
    13. In the Pi's Terminal, type `ip route show`. Locate `eth0`, if the metric for `eth0` is less than the WiFi (usually `wlan0`, then the ethernet has priority over outgoing traffic, which is causing the issues)
    14. Type `sudo nmcli con mod "Wired connection 1" ipv4.route-metric 700`
        > 700 should be replaced with whatever number is higher than what `wlan0`'s metric was.
    15. Type `sudo nmcli con up "Wired connection 1"`
    10. Attempt `ping 8.8.8.8` again to verify connectivity. If problem persists, contact Hayden (804-221-9808).
- Heads up, WSL won't play nice with the ethernet adapter. There's ways around this, but it's recommended to just use either PowerShell or the intergated terminal in VSCode.

- Images aren't appearing, camera screen is stuck, shutter button isn't working.
    1. Verify the bug, open up Pi terminal, try `gphoto2 --trigger-capture`.
    2. If there is an error that pops along the lines of `I/O In Progress` or `Can't focus` or `PTP Device Busy`, try turning off auto focus, unplug and reboot the camera, try capturing again.