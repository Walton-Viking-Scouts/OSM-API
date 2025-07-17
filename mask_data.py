#!/usr/bin/env python3
"""
OSM API Data Masking Script
Masks personal data in swagger YAML file and converts to JSON
"""

import json
import yaml
import re
import random
from pathlib import Path

# Configuration
ORIGINAL_FILE = "osm-swagger-putput"
YAML_OUTPUT = "osm-api-swagger.yaml"
JSON_OUTPUT = "swagger.json"

# Fake names for variety
FAKE_NAMES = [
    "John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", 
    "David Brown", "Emma Davis", "Tom Anderson", "Lisa Garcia",
    "Chris Martinez", "Anna Rodriguez", "James Miller", "Kate Taylor",
    "Mark Thompson", "Helen White", "Paul Harris", "Lucy Clark",
    "Steve Lewis", "Amy Walker", "Dan Hall", "Grace Allen"
]

FAKE_EMAILS = [
    "john.doe@example.com", "jane.smith@example.com", "mike.johnson@example.com",
    "sarah.wilson@example.com", "david.brown@example.com", "emma.davis@example.com",
    "tom.anderson@example.com", "lisa.garcia@example.com", "chris.martinez@example.com",
    "anna.rodriguez@example.com", "james.miller@example.com", "kate.taylor@example.com"
]

# Field patterns where names appear - mask ANY name in these fields
NAME_FIELD_PATTERNS = [
    r'(last_updated_by_name):\s*([^"\n]+)',
    r'("last_updated_by_name"):\s*"([^"]*)"',
    r'(_filterString):\s*([^"\n]+)',
    r'("_filterString"):\s*"([^"]*)"',
    r'(firstname):\s*([^"\n]+)',
    r'("firstname"):\s*"([^"]*)"',
    r'(lastname):\s*([^"\n]+)',
    r'("lastname"):\s*"([^"]*)"',
    r'(first_name):\s*([^"\n]+)',
    r'("first_name"):\s*"([^"]*)"',
    r'(last_name):\s*([^"\n]+)',
    r'("last_name"):\s*"([^"]*)"',
    r'(name):\s*([^"\n]+)',
    r'("name"):\s*"([^"]*)"',
    r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}):([^"\n]+)',  # Timestamp:Name format
    r'("[\d\-:\s]+"):\s*"([^"]*)"',  # JSON timestamp format
]

def get_random_fake_name():
    """Get a random fake name from the list"""
    return random.choice(FAKE_NAMES)

def get_random_fake_email():
    """Get a random fake email from the list"""
    return random.choice(FAKE_EMAILS)

def mask_personal_data(content):
    """
    Mask personal data in the YAML content string
    """
    print("🎭 Masking personal data...")
    
    # Mask ANY names in name fields (not just specific names)
    name_replacements = 0
    for pattern in NAME_FIELD_PATTERNS:
        matches = re.findall(pattern, content)
        if matches:
            print(f"  👤 Found {len(matches)} name field matches for pattern")
            for match in matches:
                # Generate replacement based on pattern structure
                if len(match) == 2:  # field:value or "field":"value"
                    field_part, name_part = match
                    if name_part.strip() and name_part.strip() not in ['', 'null', 'None']:
                        fake_name = get_random_fake_name()
                        # Preserve the field structure but replace the name
                        if '"' in field_part:  # JSON format
                            old_full = f'{field_part}: "{name_part}"'
                            new_full = f'{field_part}: "{fake_name}"'
                        else:  # YAML format
                            old_full = f'{field_part}: {name_part}'
                            new_full = f'{field_part}: {fake_name}'
                        content = content.replace(old_full, new_full)
                        name_replacements += 1
            
    if name_replacements > 0:
        print(f"  ✅ Replaced {name_replacements} names in name fields")
    
    # Replace email addresses with varied fake emails
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails_found = re.findall(email_pattern, content)
    if emails_found:
        print(f"  📧 Found {len(emails_found)} email addresses to mask")
        content = re.sub(email_pattern, lambda m: get_random_fake_email(), content)
    
    # Replace phone numbers (UK format)
    phone_pattern = r'\+44\d{10,11}'
    phones_found = re.findall(phone_pattern, content)
    if phones_found:
        print(f"  📞 Found {len(phones_found)} phone numbers to mask")
        content = re.sub(phone_pattern, '+44XXXXXXXXXX', content)
    
    # Replace passwords
    password_patterns = [
        r'password:\s*[^\s\n]+',
        r'"password":\s*"[^"]*"',
        r'password=\w+'
    ]
    for pattern in password_patterns:
        matches = re.findall(pattern, content)
        if matches:
            print(f"  🔐 Found {len(matches)} passwords to mask")
            content = re.sub(pattern, lambda m: m.group(0).split(':')[0] + ': password123' if ':' in m.group(0) else m.group(0).split('=')[0] + '=password123', content)
    
    # Replace device IDs (UUIDs)
    uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    uuids_found = re.findall(uuid_pattern, content)
    if uuids_found:
        print(f"  🆔 Found {len(uuids_found)} device IDs to mask")
        content = re.sub(uuid_pattern, lambda m: f"12345678-1234-1234-1234-{random.randint(100000000000, 999999999999)}", content)
    
    # Replace dates of birth
    dob_pattern = r'\d{4}-\d{2}-\d{2}'
    dobs_found = re.findall(dob_pattern, content)
    if dobs_found:
        print(f"  📅 Found {len(dobs_found)} dates to mask")
        content = re.sub(dob_pattern, '1990-01-01', content)
    
    # Replace addresses
    address_patterns = [
        r'\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Close|Cl)',
    ]
    for pattern in address_patterns:
        addresses_found = re.findall(pattern, content)
        if addresses_found:
            print(f"  🏠 Found {len(addresses_found)} addresses to mask")
            content = re.sub(pattern, '123 Example Street', content)
    
    # Replace postcodes (UK format)
    postcode_pattern = r'[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}'
    postcodes_found = re.findall(postcode_pattern, content)
    if postcodes_found:
        print(f"  📮 Found {len(postcodes_found)} postcodes to mask")
        content = re.sub(postcode_pattern, 'SW1A 1AA', content)
    
    # Replace security questions with variety
    security_questions = [
        "What was the name of your first pet?",
        "What was the model of your first car?", 
        "What was your mother's maiden name?",
        "What was the name of your first school?"
    ]
    security_pattern = r'"security_question":\s*"[^"]*"'
    security_found = re.findall(security_pattern, content)
    if security_found:
        print(f"  🔒 Found {len(security_found)} security questions to mask")
        content = re.sub(security_pattern, f'"security_question": "{random.choice(security_questions)}"', content)
    
    # Replace any remaining "John Doe" with varied names for diversity
    john_doe_pattern = r'John Doe'
    content = re.sub(john_doe_pattern, lambda m: get_random_fake_name(), content)
    
    return content

def convert_yaml_to_json(yaml_file, json_file):
    """Convert YAML file to JSON"""
    print(f"🔄 Converting YAML to JSON...")
    
    try:
        with open(yaml_file, 'r', encoding='utf-8') as f:
            yaml_data = yaml.safe_load(f)
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(yaml_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Successfully converted {yaml_file} to {json_file}")
        return True
        
    except yaml.YAMLError as e:
        print(f"❌ YAML parsing error: {e}")
        return False
    except Exception as e:
        print(f"❌ Conversion error: {e}")
        return False

def main():
    """Main function to mask the swagger file and convert to JSON"""
    print("🔒 Starting OSM API data masking...")
    
    # Check if original file exists
    if not Path(ORIGINAL_FILE).exists():
        print(f"❌ Original file {ORIGINAL_FILE} not found!")
        return
    
    # Read original file
    print(f"📖 Reading original file: {ORIGINAL_FILE}")
    with open(ORIGINAL_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"📏 Original file size: {len(content):,} characters")
    
    # Mask personal data
    masked_content = mask_personal_data(content)
    
    # Write masked YAML
    print(f"💾 Writing masked YAML: {YAML_OUTPUT}")
    with open(YAML_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(masked_content)
    
    print(f"📊 Masked YAML size: {len(masked_content):,} characters")
    
    # Convert YAML to JSON
    if convert_yaml_to_json(YAML_OUTPUT, JSON_OUTPUT):
        json_size = Path(JSON_OUTPUT).stat().st_size
        print(f"📊 Generated JSON size: {json_size:,} bytes")
        print(f"✅ Masking complete! Files ready for public use.")
    else:
        print(f"❌ Failed to convert to JSON")

if __name__ == "__main__":
    main()