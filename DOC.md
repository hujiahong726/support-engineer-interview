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

Ticket PERF-406: Balance Calculation
Cause
- The balance was computed using a for loop (adding 1/100 of amount to finalBalance repeated 100 times), which introduces floating-point rounding drift over time.
- The balance update used a stale in-memory value (account.balance + amount) and did not atomically return the stored balance, which can lead to inconsistencies (especially under rapid or concurrent updates).
Fix:
- Removed the for loop.
- Updated the balance using a increment (accounts.balance + amount) on the database side and used .returning() to fetch the updated balance in a single, atomic operation. This ensures the returned newBalance reflects what was actually written to the database.
Preventative Measures:
- Avoid manual floating-point accumulation for money.
- Prefer atomic DB operations.

Ticket PERF-408: Resource Leak
Cause:
The database initialization logic previously created new SQLite connections in initDb() and stored them in an connections array. These connections were never closed, which could lead to memory growth and resource exhaustion.
Fix:
- Modified database initialization to use a single shared SQLite connection instance. The initDb() function now only executes table creation logic using the existing connection instead of creating new connections. 
- Also, database initialization is only performed once during module import.
Preventative Measures:
- Avoid creating new database connections without explicitly closing them
- Ensure initialization functions set up schema only and do not manage database connections
- Add shutdown handling and documentation for graceful shutdown



Priority: High

Ticket VAL-201: Email Validation Problems
Cause:
No validation checks for email formats or domain
Fix:
Added validation to ensure email follows standard formatting rules (valid local part, valid domain, and required @ and . structure). Additionally, we alert the user if the domain they entered is one of the common typos we recognize. We also alert the user if their email contains letters in cap because we store them in lower case.
Preventative Measures:
- Centralized email validation and normalization logic
- Apply consistent validation rules across frontend and backend
- validating user inputs using shared schema

Ticket VAL-205: Zero Amount Funding
Cause:
Validation rules for funding amount were previously implemented only in the backend. The frontend did not have this validation, which allowed invalid funding amounts (like 0) to be submitted and only rejected after reaching the server. Additionally, validation logic for funding inputs was duplicated across layers, increasing the risk of inconsistencies and reduced code maintenability.
Fix:
Refactored funding validation into a shared schema (funding.schema.ts) used by both frontend and backend. This ensures consistent validation across the application and provides a single source of truth for funding input requirements.
Preventative Measures:
- Established a shared validation pattern to reduce duplication between frontend and backend logic.
- Ensured validation rules are defined and updated in one location.
- Reduced risk of invalid data reaching database or financial processing workflows

Ticket VAL-207: Routing Number Optional
Cause:
No validation check requiring routing number when the fundAccount type is bank.
Fix:
Added validation check in the shared schema that forces user to enter routing number if they fund their account using bank.
Preventative Measures:
- Ensured consistent validation rule in one place and that acts as a shared reference for both frontend and backend.

Ticket VAL-210: Card Type Detection
Also reference VAL-206: Card Number Validation
Cause:
The card number validation logic is too rigid. It rejects any number that is not 16 in length and doesn't start with 4 or 5. However this rejects a lot of good cards.
Fix:
We only ensure that card numbers are 13-19 in length and checks that they are valid numbers using Luhn Algorithm.
Preventative Measures:
- Have centralized validation rule for card numbers.
- Use industry standard validation logic for financial info when possible.

Ticket SEC-302: Insecure Random Numbers
Cause:
we use Math.random() to mimic generating random numbers. Math.random() is not cryptographically secure and can produce predictable value.
Fix:
We use 10-digit numeric nanoid instead. Nanoid uses a cryptographically secure random source, which means it has better unpredictability and it reduces the risk of collisions or malicious enumeration of account numbers.
Preventative Measures:
- Adopt cryptographically secure random generators for all sensitive user identifiers
- Establish guidelines requiring industry-standard libraries for ID generation
- Perform periodic security reviews to identify and replace unsafe random number usage

Ticket SEC-304: Session Management
Cause:
The system allowed multiple active sessions for the same user because existing sessions were not invalidated before creating new ones.
Fix:
Updated the workflow in auth.ts to delete any existing sessions for a user before creating a new session record. This ensures that only one active session exists per user.
Preventative Measures:
- Apply defensive programming practices to enforce session management
- Define and enforce constraints for resources that should not allow duplicate entries (e.g., active sessions per user)
- Review database write operations to ensure corresponding cleanup or invalidation logic (where appropriate)
- Encourage use of centralized session management utilities to maintain consistent behavior

Ticket PERF-403: Session Expiry
Cause:
Session validation only checked whether expiresAt > now, meaning sessions remained fully valid right up until the exact expiration timestamp. There was no proactive actions taken for sessions close to expiry, which increased risk of sessions near expiration (e.g., stolen token remains usable until the last second) and could lead to inconsistent user experience when a request happens right at expiry.
Fix:
- Added a session refresh window and proactive rotation logic:
- Introduced a threshold (THRESHOLD_MS = 15 minutes) to detect sessions nearing expiration.
- When a valid session has less than the threshold remaining, generate a new session token and extend expiration (SESSION_DURATION_MS = 7 days).
- Rotate the session in a database transaction and enforce “single active session per user” by deleting existing sessions before inserting the refreshed session.
- Update the session cookie with secure attributes (HttpOnly, SameSite=Strict, Secure in production).
Preventative Measures:
- Define explicit centralized session lifecycle rules (rotation window, duration, single-session policy).
- Add tests for edge cases around expiration.

