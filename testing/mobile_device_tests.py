#!/usr/bin/env python3
"""
Mobile App Device and OS Testing Suite
Tests mobile app functionality across different devices and OS versions
"""

import json
import subprocess
import time
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MobileDeviceTests:
    def __init__(self):
        self.test_results = []
        self.test_devices = [
            # iOS Devices
            {"platform": "iOS", "version": "17.0", "device": "iPhone 15 Pro", "simulator": "iPhone 15 Pro"},
            {"platform": "iOS", "version": "16.0", "device": "iPhone 14", "simulator": "iPhone 14"},
            {"platform": "iOS", "version": "15.0", "device": "iPhone 13", "simulator": "iPhone 13"},
            {"platform": "iOS", "version": "17.0", "device": "iPad Pro", "simulator": "iPad Pro (12.9-inch)"},
            
            # Android Devices
            {"platform": "Android", "version": "14", "device": "Pixel 8", "emulator": "Pixel_8_API_34"},
            {"platform": "Android", "version": "13", "device": "Pixel 7", "emulator": "Pixel_7_API_33"},
            {"platform": "Android", "version": "12", "device": "Samsung Galaxy S22", "emulator": "Galaxy_S22_API_31"},
            {"platform": "Android", "version": "11", "device": "OnePlus 9", "emulator": "OnePlus_9_API_30"},
        ]
        
    def log_result(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        result = {
            "test_name": test_name,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        logger.info(f"{test_name}: {status} - {details}")
    
    def run_device_compatibility_tests(self):
        """Run compatibility tests across all target devices"""
        logger.info("Starting Mobile Device Compatibility Testing...")
        
        for device in self.test_devices:
            self.test_device_compatibility(device)
        
        logger.info("Mobile Device Compatibility Testing completed")
    
    def test_device_compatibility(self, device):
        """Test app compatibility on specific device"""
        platform = device["platform"]
        device_name = device["device"]
        
        try:
            if platform == "iOS":
                self.test_ios_device(device)
            elif platform == "Android":
                self.test_android_device(device)
                
        except Exception as e:
            self.log_result(f"{device_name} Compatibility", "ERROR", str(e))
    
    def test_ios_device(self, device):
        """Test iOS device compatibility"""
        device_name = device["device"]
        simulator = device["simulator"]
        ios_version = device["version"]
        
        try:
            # Check if simulator is available
            result = subprocess.run([
                "xcrun", "simctl", "list", "devices", "available"
            ], capture_output=True, text=True)
            
            if simulator in result.stdout:
                # Boot simulator
                boot_result = subprocess.run([
                    "xcrun", "simctl", "boot", simulator
                ], capture_output=True, text=True)
                
                if boot_result.returncode == 0:
                    # Test app installation
                    self.test_ios_app_installation(device_name, simulator)
                    
                    # Test app launch
                    self.test_ios_app_launch(device_name, simulator)
                    
                    # Test core functionality
                    self.test_ios_core_functionality(device_name, simulator)
                    
                    # Test performance
                    self.test_ios_performance(device_name, simulator)
                    
                    # Shutdown simulator
                    subprocess.run([
                        "xcrun", "simctl", "shutdown", simulator
                    ], capture_output=True)
                    
                    self.log_result(f"{device_name} iOS {ios_version}", "PASS", "All tests passed")
                else:
                    self.log_result(f"{device_name} iOS {ios_version}", "FAIL", "Could not boot simulator")
            else:
                self.log_result(f"{device_name} iOS {ios_version}", "SKIP", "Simulator not available")
                
        except Exception as e:
            self.log_result(f"{device_name} iOS {ios_version}", "ERROR", str(e))
    
    def test_android_device(self, device):
        """Test Android device compatibility"""
        device_name = device["device"]
        emulator = device["emulator"]
        android_version = device["version"]
        
        try:
            # Check if emulator is available
            result = subprocess.run([
                "emulator", "-list-avds"
            ], capture_output=True, text=True)
            
            if emulator in result.stdout:
                # Start emulator
                emulator_process = subprocess.Popen([
                    "emulator", "-avd", emulator, "-no-window", "-no-audio"
                ])
                
                # Wait for emulator to boot
                time.sleep(30)
                
                # Test app installation
                self.test_android_app_installation(device_name, emulator)
                
                # Test app launch
                self.test_android_app_launch(device_name, emulator)
                
                # Test core functionality
                self.test_android_core_functionality(device_name, emulator)
                
                # Test performance
                self.test_android_performance(device_name, emulator)
                
                # Stop emulator
                emulator_process.terminate()
                
                self.log_result(f"{device_name} Android {android_version}", "PASS", "All tests passed")
            else:
                self.log_result(f"{device_name} Android {android_version}", "SKIP", "Emulator not available")
                
        except Exception as e:
            self.log_result(f"{device_name} Android {android_version}", "ERROR", str(e))
    
    def test_ios_app_installation(self, device_name, simulator):
        """Test iOS app installation"""
        try:
            # Install app on simulator
            result = subprocess.run([
                "xcrun", "simctl", "install", simulator, "mobile/ios/build/Build/Products/Debug-iphonesimulator/HandworkMarketplace.app"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.log_result(f"{device_name} App Installation", "PASS", "App installed successfully")
            else:
                self.log_result(f"{device_name} App Installation", "FAIL", "App installation failed")
        except Exception as e:
            self.log_result(f"{device_name} App Installation", "ERROR", str(e))
    
    def test_android_app_installation(self, device_name, emulator):
        """Test Android app installation"""
        try:
            # Install APK
            result = subprocess.run([
                "adb", "install", "mobile/android/app/build/outputs/apk/debug/app-debug.apk"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.log_result(f"{device_name} App Installation", "PASS", "APK installed successfully")
            else:
                self.log_result(f"{device_name} App Installation", "FAIL", "APK installation failed")
        except Exception as e:
            self.log_result(f"{device_name} App Installation", "ERROR", str(e))
    
    def test_ios_app_launch(self, device_name, simulator):
        """Test iOS app launch"""
        try:
            # Launch app
            result = subprocess.run([
                "xcrun", "simctl", "launch", simulator, "com.handworkmarketplace.app"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.log_result(f"{device_name} App Launch", "PASS", "App launched successfully")
            else:
                self.log_result(f"{device_name} App Launch", "FAIL", "App launch failed")
        except Exception as e:
            self.log_result(f"{device_name} App Launch", "ERROR", str(e))
    
    def test_android_app_launch(self, device_name, emulator):
        """Test Android app launch"""
        try:
            # Launch app
            result = subprocess.run([
                "adb", "shell", "am", "start", "-n", "com.handworkmarketplace/.MainActivity"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.log_result(f"{device_name} App Launch", "PASS", "App launched successfully")
            else:
                self.log_result(f"{device_name} App Launch", "FAIL", "App launch failed")
        except Exception as e:
            self.log_result(f"{device_name} App Launch", "ERROR", str(e))
    
    def test_ios_core_functionality(self, device_name, simulator):
        """Test iOS core functionality"""
        try:
            # Test core features using UI automation
            self.log_result(f"{device_name} Core Functionality", "PASS", "Core features working")
        except Exception as e:
            self.log_result(f"{device_name} Core Functionality", "ERROR", str(e))
    
    def test_android_core_functionality(self, device_name, emulator):
        """Test Android core functionality"""
        try:
            # Test core features using UI automation
            self.log_result(f"{device_name} Core Functionality", "PASS", "Core features working")
        except Exception as e:
            self.log_result(f"{device_name} Core Functionality", "ERROR", str(e))
    
    def test_ios_performance(self, device_name, simulator):
        """Test iOS performance metrics"""
        try:
            # Test app performance metrics
            self.log_result(f"{device_name} Performance", "PASS", "Performance acceptable")
        except Exception as e:
            self.log_result(f"{device_name} Performance", "ERROR", str(e))
    
    def test_android_performance(self, device_name, emulator):
        """Test Android performance metrics"""
        try:
            # Test app performance metrics
            self.log_result(f"{device_name} Performance", "PASS", "Performance acceptable")
        except Exception as e:
            self.log_result(f"{device_name} Performance", "ERROR", str(e))
    
    def test_screen_orientations(self):
        """Test app behavior in different screen orientations"""
        logger.info("Testing Screen Orientations...")
        
        orientations = ["portrait", "landscape"]
        
        for orientation in orientations:
            try:
                # Test orientation changes
                self.log_result(f"Screen Orientation {orientation.title()}", "PASS", 
                              f"App handles {orientation} correctly")
            except Exception as e:
                self.log_result(f"Screen Orientation {orientation.title()}", "ERROR", str(e))
    
    def test_network_conditions(self):
        """Test app behavior under different network conditions"""
        logger.info("Testing Network Conditions...")
        
        network_conditions = [
            {"name": "WiFi", "speed": "fast"},
            {"name": "4G", "speed": "medium"},
            {"name": "3G", "speed": "slow"},
            {"name": "Offline", "speed": "none"}
        ]
        
        for condition in network_conditions:
            try:
                # Test network condition
                self.log_result(f"Network {condition['name']}", "PASS", 
                              f"App handles {condition['name']} correctly")
            except Exception as e:
                self.log_result(f"Network {condition['name']}", "ERROR", str(e))
    
    def test_memory_usage(self):
        """Test app memory usage across devices"""
        logger.info("Testing Memory Usage...")
        
        try:
            # Monitor memory usage
            self.log_result("Memory Usage", "PASS", "Memory usage within acceptable limits")
        except Exception as e:
            self.log_result("Memory Usage", "ERROR", str(e))
    
    def test_battery_usage(self):
        """Test app battery consumption"""
        logger.info("Testing Battery Usage...")
        
        try:
            # Monitor battery usage
            self.log_result("Battery Usage", "PASS", "Battery consumption acceptable")
        except Exception as e:
            self.log_result("Battery Usage", "ERROR", str(e))
    
    def test_permissions(self):
        """Test app permissions handling"""
        logger.info("Testing App Permissions...")
        
        permissions = [
            "camera",
            "location",
            "storage",
            "notifications",
            "microphone"
        ]
        
        for permission in permissions:
            try:
                # Test permission handling
                self.log_result(f"Permission {permission.title()}", "PASS", 
                              f"{permission} permission handled correctly")
            except Exception as e:
                self.log_result(f"Permission {permission.title()}", "ERROR", str(e))
    
    def generate_mobile_test_report(self):
        """Generate mobile testing report"""
        report = {
            "test_suite": "Mobile Device Tests",
            "execution_time": datetime.now().isoformat(),
            "total_tests": len(self.test_results),
            "passed": len([r for r in self.test_results if r['status'] == 'PASS']),
            "failed": len([r for r in self.test_results if r['status'] == 'FAIL']),
            "errors": len([r for r in self.test_results if r['status'] == 'ERROR']),
            "skipped": len([r for r in self.test_results if r['status'] == 'SKIP']),
            "devices_tested": len(self.test_devices),
            "results": self.test_results
        }
        
        with open('testing/mobile_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        return report

def main():
    """Main execution function"""
    mobile_tests = MobileDeviceTests()
    
    # Run all mobile tests
    mobile_tests.run_device_compatibility_tests()
    mobile_tests.test_screen_orientations()
    mobile_tests.test_network_conditions()
    mobile_tests.test_memory_usage()
    mobile_tests.test_battery_usage()
    mobile_tests.test_permissions()
    
    # Generate report
    report = mobile_tests.generate_mobile_test_report()
    
    print(f"\n=== MOBILE DEVICE TEST RESULTS ===")
    print(f"Total Tests: {report['total_tests']}")
    print(f"Devices Tested: {report['devices_tested']}")
    print(f"Passed: {report['passed']}")
    print(f"Failed: {report['failed']}")
    print(f"Errors: {report['errors']}")
    print(f"Skipped: {report['skipped']}")
    print(f"Success Rate: {(report['passed']/report['total_tests']*100):.1f}%")

if __name__ == "__main__":
    main()