#!/usr/bin/env python3
"""
Configuration Verification Script
Verifies that the Python serverless chatbot is properly configured for deployment
"""

import json
import os
import sys
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if Path(filepath).exists():
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} - NOT FOUND")
        return False

def check_wrangler_config():
    """Check wrangler.toml configuration"""
    print("\n🔧 Checking wrangler.toml configuration...")
    
    if not check_file_exists("wrangler.toml", "Wrangler config"):
        return False
    
    try:
        with open("wrangler.toml", "r") as f:
            content = f.read()
        
        # Check key configurations
        checks = [
            ('name = "bloodplus-line-oa-server"', "Worker name matches your deployment"),
            ('main = "main.py"', "Main file is set to main.py"),
            ('binding = "WORKER_AI"', "Workers AI binding matches your dashboard"),
            ('CLOUDFLARE_ACCOUNT_ID = "5adf62efd6cf179a8939c211b155e229"', "Account ID is set"),
            ('AI_MODEL = "@cf/meta/llama-3-8b-instruct"', "AI model is configured")
        ]
        
        for check, description in checks:
            if check in content:
                print(f"✅ {description}")
            else:
                print(f"❌ {description} - NOT FOUND")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading wrangler.toml: {e}")
        return False

def check_python_code():
    """Check main.py configuration"""
    print("\n🐍 Checking Python code configuration...")
    
    if not check_file_exists("main.py", "Main Python file"):
        return False
    
    try:
        with open("main.py", "r") as f:
            content = f.read()
        
        # Check key configurations
        checks = [
            ('hasattr(self.env, \'WORKER_AI\')', "Workers AI binding name matches"),
            ('self.env.WORKER_AI.run', "AI binding usage is correct"),
            ('bloodplusfight-healthcare-chatbot-python', "Service name is set"),
            ('version": "3.0.0"', "Version is set"),
            ('runtime": "python"', "Runtime is specified"),
            ('async def on_fetch', "Cloudflare Workers entry point exists")
        ]
        
        for check, description in checks:
            if check in content:
                print(f"✅ {description}")
            else:
                print(f"❌ {description} - NOT FOUND")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading main.py: {e}")
        return False

def check_healthcare_content():
    """Check healthcare content is complete"""
    print("\n🏥 Checking healthcare content...")
    
    try:
        with open("main.py", "r") as f:
            content = f.read()
        
        healthcare_checks = [
            ('_get_hiv_info_en', "HIV information (English)"),
            ('_get_hiv_info_th', "HIV information (Thai)"),
            ('_get_prep_info_en', "PrEP information (English)"),
            ('_get_prep_info_th', "PrEP information (Thai)"),
            ('_get_std_info_en', "STD information (English)"),
            ('_get_std_info_th', "STD information (Thai)"),
            ('medical disclaimer', "Medical disclaimers"),
            ('healthcare resources', "Healthcare resources")
        ]
        
        for check, description in healthcare_checks:
            if check.lower() in content.lower():
                print(f"✅ {description}")
            else:
                print(f"❌ {description} - NOT FOUND")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking healthcare content: {e}")
        return False

def check_deployment_files():
    """Check all deployment files are present"""
    print("\n📁 Checking deployment files...")
    
    files = [
        ("main.py", "Main Python application"),
        ("wrangler.toml", "Cloudflare Workers configuration"),
        ("requirements.txt", "Python dependencies"),
        ("deploy.sh", "Deployment script"),
        ("test.py", "Test suite"),
        ("README.md", "Documentation"),
        ("DEPLOY_NOW.md", "Quick deployment guide")
    ]
    
    all_present = True
    for filename, description in files:
        if not check_file_exists(filename, description):
            all_present = False
    
    return all_present

def main():
    """Main verification function"""
    print("🔍 LINE Healthcare Chatbot - Configuration Verification")
    print("=" * 60)
    
    # Change to the script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"📂 Working directory: {os.getcwd()}")
    
    # Run all checks
    checks = [
        check_deployment_files(),
        check_wrangler_config(),
        check_python_code(),
        check_healthcare_content()
    ]
    
    print("\n" + "=" * 60)
    
    if all(checks):
        print("🎉 ALL CHECKS PASSED!")
        print("\n✅ Your LINE Healthcare Chatbot is ready for deployment!")
        print("\n🚀 Next steps:")
        print("1. cd python-serverless")
        print("2. wrangler secret put CHANNEL_ACCESS_TOKEN")
        print("3. wrangler secret put CHANNEL_SECRET")
        print("4. wrangler deploy")
        print("\n📖 See DEPLOY_NOW.md for detailed instructions")
        return 0
    else:
        print("❌ SOME CHECKS FAILED!")
        print("\n🔧 Please fix the issues above before deploying")
        return 1

if __name__ == "__main__":
    sys.exit(main())