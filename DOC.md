Ticket VAL-202: Date of Birth Validation
Cause:
The DOB input field only required a value and there was no validation for out-of-range or invalid dates.
Fix:
Added DOB validation on both frontend and backend. The validation makes sure:
- DOB is not in the future
- User is at least 18 years old
- User age does not exceed 130 years (sanity check)
Preventative Measures:
Add validations for other user input fields to reduce invalid or unsafe inputs.

