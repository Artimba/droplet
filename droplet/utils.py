from time import sleep
from datetime import datetime
from sh import gphoto2 as gp
import signal
import os
import subprocess
import smbus
import math
import time

# Initalize I2C bus for reading from sensor
i2c = smbus.SMBus(1)
addr=0x45
i2c.write_byte_data(addr, 0x23, 0x34)
time.sleep(0.5)

# Kill the gphoto2 process that starts whenever camera is connected.
# Look up gvfsd-gphoto2's pid.
def kill_gphoto2() -> None:
    # Run the ps command, send output to a pipe.
    ps = subprocess.Popen(['ps', '-A'], stdout=subprocess.PIPE)
    # Grab the output we left in the pipe.
    out, err = ps.communicate()
    if err:
        print("Error running ps: " + err.decode())
        return

    print("Attempting to kill gphoto2 process.")
    # Look for the line that contains gvfsd-gphoto2.
    for line in out.splitlines():
        if b'gvfsd-gphoto2' in line:
            pid = int(line.split(None, 1)[0])
            os.kill(pid, signal.SIGKILL) # Execute Order 66 (POSIX kill)
            print("Killed gphoto2 process. Continuing...")
            return
    print("No gphoto2 process found. Continuing...")

# Capture and download the image to the images directory.
def capture_image(pic_id: int) -> str:
    # Ensure the camera is accessible.
    kill_gphoto2()
    shot_date = datetime.now().strftime("%Y-%m-%d")
    shot_time = datetime.now().strftime("%Y%m%dT%H%M%S")
    filename = "/home/hawhite2/droplet/images/" + pic_id + "_" + shot_time + ".jpg"
    # Capture the image. Save the image file name.
    gp("--capture-image-and-download", "--filename", filename)
    print("Image captured.")
    return pic_id + "_" + shot_time + ".jpg"

def read_sensor_data():
    i2c.write_byte_data(addr, 0xe0, 0x0)
    data = i2c.read_i2c_block_data(addr, 0x0, 6)
    rawT = ((data[0]) << 8) | (data[1])
    rawR = ((data[3]) << 8) | (data[4])
    temp = round(-45 + rawT * 175 / 65535, 1)
    RH = round(100 * rawR / 65535, 1)
    return {'temperature': temp, 'humidity': RH}
