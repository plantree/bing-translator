#!/bin/bash python3

'''
Utility functions for language
'''
import requests
import json

def get_support_languages():
    """
    Get the supported languages from Bing Translator
    """
    url = 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0'
    response = requests.get(url).json()
    lang_map = {}
    for key, value in response['translation'].items():
        lang_map[key] = value['name']
    return lang_map

if __name__ == '__main__':
    lang_map = get_support_languages()
    print(json.dumps(lang_map, indent=4, sort_keys=True))