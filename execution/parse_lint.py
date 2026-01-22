import json
import subprocess
import os

def run_lint():
    try:
        # Run eslint with json format
        result = subprocess.run(
            ['npx', 'eslint', 'src', 'electron', '--ext', '.ts,.vue', '--format', 'json'],
            capture_output=True,
            text=True,
            cwd='c:/Workspace/AI Cluster Command Center',
            shell=True
        )
        
        # ESLint returns non-zero exit code if there are errors
        if not result.stdout:
            print("No output from ESLint")
            if result.stderr:
                print(f"Error: {result.stderr}")
            return

        data = json.loads(result.stdout)
        
        errors = []
        warnings = []
        
        for file_entry in data:
            file_path = file_entry['filePath']
            for msg in file_entry['messages']:
                item = {
                    'file': file_path,
                    'line': msg.get('line'),
                    'column': msg.get('column'),
                    'rule': msg.get('ruleId'),
                    'severity': 'ERROR' if msg.get('severity') == 2 else 'WARNING',
                    'message': msg.get('message')
                }
                if item['severity'] == 'ERROR':
                    errors.append(item)
                else:
                    warnings.append(item)
        
        print(f"Found {len(errors)} errors and {len(warnings)} warnings.\n")
        
        if errors:
            print("ERRORS:")
            for err in errors:
                print(f"[{err['rule']}] {err['file']}:{err['line']}:{err['column']} - {err['message']}")
            print("\n")
            
        if warnings:
            print("WARNINGS (Top 20):")
            for warn in warnings[:20]:
                print(f"[{warn['rule']}] {warn['file']}:{warn['line']}:{warn['column']} - {warn['message']}")
            if len(warnings) > 20:
                print(f"... and {len(warnings) - 20} more warnings.")

    except Exception as e:
        print(f"Failed to parse lint output: {e}")

if __name__ == "__main__":
    run_lint()
