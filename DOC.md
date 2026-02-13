Ticket VAL-202: Date of Birth Validation
Cause:
The DOB input field previously only required a value and there was no check for whether the user is a minor or any validation for invalid dates.
Fix:
Added DOB validation on both frontend and backend. The validation makes sure that:
- DOB is not a future date
- User is at least 18 years old
- User's age does not exceed 130 (sanity check)
Preventative Measures:
Add validations for other user input fields to prevent invalid or unsafe inputs.

Ticket VAL-206: Card Number Validation
Cause:
The original check for card number is wrong. It forces 
1. card numbers to be exactly 16 in length
2. card numbers to start with 4 or 5
But most importantly, it doesn't check the number using the Luhn Algorithm, which is the industry standard for validating card numbers.
Fix:
Added function to normalize card numbers by removing hyphens and dashes and spaces (some users might put in their numbers in these ways). 
Added/modified validation rules:
1. card numbers are 13-19 in length
2. card numbers are validated using the Luhn Algorithm
Testing:
Added Luhn Algorithm testing in lib/validation/card.test.ts
Preventative Measures:
Ensure that other input fields (phone numbers, ) also have correct validation checks.


