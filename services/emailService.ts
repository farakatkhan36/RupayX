import emailjs from '@emailjs/browser';
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../constants';

export const sendOtpEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    const templateParams = {
      to_email: email,
      message: `Your RupayX Verification Code is: ${otp}`,
      code: otp, // Assuming the template might use {{code}}
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('EmailJS Response:', response.status, response.text);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return false;
  }
};

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};