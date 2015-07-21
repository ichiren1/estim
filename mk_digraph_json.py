import os
import sys

with open(sys.argv[1]) as inp:
    print "{links:["
    for L in inp:
        key, value = L.strip().split('->')
        key = key.strip()
        values = value.split(',')
        for v in values:
            print "{\"source\":\""+key.strip().replace("\"", "\\\"")+"\", \"target\":\""+v.strip().replace("\"", "\\\"")+"\", \"value\":1},"

    print "]}"
