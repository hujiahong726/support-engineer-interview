Priority: Critical

Ticket VAL-202: Date of Birth Validation
Cause:
The DOB input field previously only required a value and there was no check for whether the user is a minor or any validation for invalid dates.
Fix:
Added DOB validation on both frontend and backend. The validation makes sure that:
- DOB is not a future date
- User is at least 18 years old
- User's age does not exceed 130 (sanity check)
Testing:
Tested on frontend interface with valid and invalid inputs to ensure correct behavior.
Preventative Measures:
- Use standard functions for age calculation to avoid errors (e.g., leap years).

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
- Avoid hardcoding lengths or prefixes for complex formats (like cards, phone numbers, or ZIP codes). 
- Use industry-standard algorithms and libraries to validate.
- Always implement a normalization step before validation logic to accommodate custom user formatting.
- When adding validation for data that comes in different "flavors" (e.g., Visa vs. Amex, or US vs. International phone numbers), include test cases to address these complexities.

Ticket VAL-208: Weak Password Requirements
Cause:
No validation checks to ensure strong passwords. Only checks the input against three common passwords, which is not adequate.
Fix:
Added validation checks:
- must have upper case letter
- must have lower case letter
- must have digit
- must have special character
Testing:
Tested on frontend interface on valid and invalid inputs to ensure correct behavior.
Preventative Measures:
- Move password rules to a shared utility or schema (like Zod) so that the Signup and Change Password forms always use the exact same rules.
- Consider using a library like zxcvbn to measure password entropy (strength) rather than just "character checking," which can sometimes lead users to create predictable passwords (e.g., Password123!).
- Ensure these same rules are enforced on the API/Backend.

Ticket SEC-301: SSN Storage
Cause:
SSN is stored in plaintext in database.
Fix:
- Store only the last four digits of ssn: ssnLast4
- Store ssnHash (HMAC) for uniqueness checks
Testing:
Tested by signing up and investigating the users table in the sqlite database. Only ssnLast4 and ssnHash stored and not the actual ssn.
Preventative Measures:
- Think about whether storing sensitive, private user information is even necessary for our use case.
- Always keep user data privacy front of mind.
- Purge sensitive data after it’s no longer needed

Ticket SEC-303: XSS Vulnerability
Cause:
A transaction description is rendered as raw HTML instead of plain text. We were using dangerouslySetInnerHTML for descriptions, which is a huge XSS risk.
Fix:
Changed it to rendering in normal text so everything is escaped by default.
Preventative Measures:
- Enable ESLint rules to block dangerouslySetInnerHTML without an explicit override.
- Use DOMPurify sanitization to allow a limited set of safe HTML.
- Check for other instances of raw HTML rendering.

Ticket PERF-401: Account Creation Error
Cause:
The logic for creating accounts returned a fallback account object with a hardcoded $100 balance when failed to create an account.
Fix:
The system should throw an error when we fail to create an account. This way, we don't create fallback account object and therefore no fabricated data.
Preventative Measures:
- Avoid returning default data (especially for financial operations) when database operations fail.
- Ensure we report database failures and have proper error handling in place

Ticket PERF-405: Missing Transactions
Cause:
Race condition could happen when multiple users fund their accounts at the same time. The transaction we fetched may not be the one that we created (since we didn't check for the account id).
Fix:
Directly return the transaction we created instead of creating and fetching. This way we ensure atomicity and prevent race conditions.
Preventative Measures:
- Avoid read-after-write operations that rely on orderBy to identify the newly created record
- Always find transaction queries by accountId

