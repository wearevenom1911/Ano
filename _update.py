try:
    import openpyxl
    path = "/Users/venom1911/Downloads/Ano-site/laptops.xlsx"
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    target = "HP EliteBook 845 G8"
    found = False
    for r in range(3, ws.max_row + 1):
        n = ws.cell(r, 1).value
        if n and str(n).strip() == target:
            ws.cell(r, 6).value = 18500
            ws.cell(r, 8).value = "No"
            found = True
            msg = "updated row %d: %s -> price 18500, InStock No" % (r, target)
            break
    if not found:
        msg = "NOT FOUND"
    wb.save(path)
    msg = msg + " | saved OK"
    with open("/Users/venom1911/Downloads/Ano-site/_result.txt", "w") as f:
        f.write(msg)
except Exception as e:
    with open("/Users/venom1911/Downloads/Ano-site/_result.txt", "w") as f:
        f.write("ERROR: %s" % repr(e))