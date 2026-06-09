import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

MAIL_USERNAME = "myid.d2004@gmail.com"
MAIL_PASSWORD = "ddeucufltuhhsnuo"
TO_EMAIL = "myid.d2004@gmail.com"  # sending to yourself to test

print("Connecting to Gmail SMTP...")

try:
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.ehlo()
    server.starttls()
    print("TLS started...")

    server.login(MAIL_USERNAME, MAIL_PASSWORD)
    print("Login successful!")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "✅ Test Email - Ticket System"
    msg["From"] = MAIL_USERNAME
    msg["To"] = TO_EMAIL

    html = """
    <html><body>
    <h2>🎫 Email is working!</h2>
    <p>Your ticket system email setup is correct.</p>
    </body></html>
    """
    msg.attach(MIMEText(html, "html"))

    server.sendmail(MAIL_USERNAME, TO_EMAIL, msg.as_string())
    server.quit()
    print("✅ Email sent! Check your inbox.")

except smtplib.SMTPAuthenticationError:
    print("❌ Authentication failed — wrong App Password")
except smtplib.SMTPException as e:
    print(f"❌ SMTP error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")