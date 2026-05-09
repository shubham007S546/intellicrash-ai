
with open('python/api.py', 'r', encoding='utf-8') as f:
    content = f.read()
    print('Triple double quotes:', content.count('"""'))
    print('Triple single quotes:', content.count("'''"))
