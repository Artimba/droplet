# Common Issues
- gphoto2 error, **Error (-53: 'Could not claim the USB device')**
    1. In terminal, run the command `ps -A`
    2. Find the program under the name `gvfsd-gphoto2`, copy its pid (the 4-5 digit number next to the name).
    3. Run `kill {pid}`.
        > For example, if the pid of `gvfsd-gphoto2` was `89428`, I would run `kill 89428`.
    4. Attempt the program again.
- Pi cannot connect to internet.
    1. Verify internet status, run `ping 8.8.8.8` (Google DNS) in the Pi's terminal.
    2. (Windows) In the computer the ethernet adapter is connected to, go to `Network and Internet Settings`
    3. Go to `Advanced network settings`
    4. Locate the source network (the network we want to share the internet from).
        > This will either be eduroam, wolftech, or a local network.
    5. Expand the network settings, find `More adapter options`. Click Edit.
    6. In the popup, go to the `sharing` tab.
    7. Check the box `Allow other network users to connect through this computer's internet connection`
    8. In the `Home networking connection:` field, select the `Ethernet` option in the dropdown.
        > This can sometimes be called something else depending on network configuration. To verify the name, go back to the `advanced network settings` page and verify what the computer is calling the `ASIX USB to Gigabit Ethernet Adapter`, in my case, it's just Ethernet, but it might be Ethernet2 or something else.
    9. Hit ok to exit the properties window. Go back to the Pi's terminal and enter `sudo service networking restart`. 
    10. Attempt `ping 8.8.8.8` again to verify connectivity. If problem persists, contact Hayden (804-221-9808).
- Heads up, WSL won't play nice with the ethernet adapter. There's ways around this, but it's recommended to just use either PowerShell or the intergated terminal in VSCode.