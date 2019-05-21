#!/usr/bin/python27

from fpdf import FPDF, HTMLMixin
import os
import pyqrcode
from string import Template
import urllib


url_base = "https://d2e5g9374uwnt2.cloudfront.net"

params = {
    "username": "student23",
    "password": "12E456t*"
}

url = url_base + "?" + urllib.urlencode(params)
print(url)

qr = pyqrcode.create(url)
qr.png('url.png', scale=2)


template_file = open('./template.html')

# template_file = open('/home/ec2-user/environment/sth34t/tools/template.html')
src = Template(template_file.read())
template_file.close()

params['console_link'] = "https://sttt.signin.aws.amazon.com/console"
params['ws_registration'] = "WSpdx+P2D4ZD"
params['ws_password'] = "foo"
params['access_key'] = "xxx"
params['secret_key'] = "yyy"
params['voucher'] = 'zzz'
dst = src.substitute(params)

class MyPDF(FPDF, HTMLMixin):
    pass

pdf = MyPDF()
pdf.add_page()
pdf.image('url.png')
pdf.set_font('Arial', '', 9)
pdf.write_html(dst)

outfile = params['username'] + ".pdf"
pdf.output(outfile, 'F')

os.remove('url.png')

print('done')