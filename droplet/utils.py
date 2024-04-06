from time import sleep
from datetime import datetime
from flask import current_app
from sh import gphoto2 as gp
import signal
import os
import subprocess
import smbus
import math
import time
from shutil import copyfile

# Initalize I2C bus for reading from sensor
try:
    i2c = smbus.SMBus(1)
    addr=0x45
    i2c.write_byte_data(addr, 0x23, 0x34)
    time.sleep(0.5)
except PermissionError as e:
    if os.getenv('DEBUG_MODE') == "True":
        print("DEBUG_MODE enabled. Continuing...")
    else:
        print("Encountered permission error. If this is running on a Raspberry Pi, enable I2C communication.")
        print("If this is running a debug non-Pi environment, run export DEBUG_MODE=True.")
        exit(1)

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
    try:
        # Ensure the camera is accessible.
        kill_gphoto2()
        shot_date = datetime.now().strftime("%Y-%m-%d")
        shot_time = datetime.now().strftime("%Y%m%dT%H%M%S")
        image_dir = current_app.config['IMAGE_DIRECTORY']
        filename = pic_id + "_" + shot_time + ".jpg"
        file_path = os.path.join(image_dir, filename)
        # Capture the image. Save the image file name.
        gp("--capture-image-and-download", "--filename", file_path)
        print("Image captured.")
        return filename
    except Exception as e:
        if os.getenv('DEBUG_MODE') == "True":
            print("DEBUG_MODE enabled. Returning mock image name.")
            return mock_capture_image(shot_time, pic_id)
        else:
            print("Encountered error capturing image.")
            print(e)
            exit(1)

def read_sensor_data():
    try:
        i2c.write_byte_data(addr, 0xe0, 0x0)
        data = i2c.read_i2c_block_data(addr, 0x0, 6)
        rawT = ((data[0]) << 8) | (data[1])
        rawR = ((data[3]) << 8) | (data[4])
        temp = round(-45 + rawT * 175 / 65535, 1)
        RH = round(100 * rawR / 65535, 1)
        return {'temperature': temp, 'humidity': RH}
    except Exception as e:
        if os.getenv('DEBUG_MODE') == "True":
            print("DEBUG_MODE enabled. Returning mock sensor data.")
            return mock_sensor_data()
        else:
            print("Encountered error reading sensor data.")
            print(e)
            exit(1)

def mock_sensor_data():
    return {'temperature': 25.0, 'humidity': 50.0}

def mock_capture_image(shot_time: str, pic_id: int) -> str:
    # Make a copy of droplet_20240404T133433.jpg, assigning it a new name.
    # This is to simulate the capture_image function.
    image_directory = current_app.config['IMAGE_DIRECTORY']
    source_filename = "droplet_20240404T133433.jpg"
    source_file = os.path.join(image_directory, source_filename)
    dir = os.path.dirname(source_file)
    dest_filename = pic_id + "_" + shot_time + ".jpg"
    dest_path = os.path.join(dir, dest_filename)
    copyfile(source_file, dest_path)
    return dest_filename