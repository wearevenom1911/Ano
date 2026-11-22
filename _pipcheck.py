import sys
try:
    import openpyxl
    res = "openpyxl OK " + openpyxl.__version__
except Exception as e:
    res = "ERR: " + repr(e)
with open("/Users/venom1911/Downloads/Ano-site/_pip.txt", "w") as f:
    f.write(res)
"