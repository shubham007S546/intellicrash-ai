
import sys

def clean_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace em-dash with hyphen
        new_content = content.replace('\u2014', '-')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Cleaned {filepath}")
    except Exception as e:
        print(f"Error cleaning {filepath}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python clean_api.py <filepath>")
    else:
        clean_file(sys.argv[1])
