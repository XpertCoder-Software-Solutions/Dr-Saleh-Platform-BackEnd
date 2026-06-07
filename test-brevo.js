require('dotenv').config();

const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

sendSmtpEmail.sender = {
  name: process.env.BREVO_SENDER_NAME,
  email: process.env.BREVO_SENDER_EMAIL,
};

sendSmtpEmail.to = [
  {
    email: 'amrderraz822@gmail.com',
    name: 'Amr',
  },
];

sendSmtpEmail.subject = 'Test Dr. Saleh OTP';
sendSmtpEmail.htmlContent = '<h1>Your OTP is 123456</h1>';

apiInstance.sendTransacEmail(sendSmtpEmail)
  .then((data) => {
    console.log('Brevo success:', data);
  })
  .catch((error) => {
    console.error('Brevo error:', error?.response?.body || error);
  });