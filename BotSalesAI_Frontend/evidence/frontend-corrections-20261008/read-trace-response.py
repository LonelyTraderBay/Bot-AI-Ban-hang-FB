import json
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    for name in archive.namelist():
        if not name.endswith('.network'):
            continue
        for line in archive.read(name).decode().splitlines():
            data = json.loads(line).get('snapshot', {})
            request = data.get('request', {})
            response = data.get('response', {})
            if request.get('method') != 'POST' or '/api/' not in request.get('url', ''):
                continue
            body = response.get('content', {}).get('_sha1')
            print(request.get('url'), response.get('status'))
            print(request.get('postData', {}).get('text', ''))
            if body:
                print(archive.read('resources/' + body).decode())
