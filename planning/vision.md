I'd like to create a clinic management app that supports both mobile and web interfaces.
Target audience is business owners and clients for body treatment and psychology clinics.
It has to support multiple tenants. Authentication has to be done via google auth. Data isolation is a must have across tenants. Customer data cannot leak within a tenant and between tenants.
It would manage PII and health information so has to be very secure.

The set of initial requirements in mind are:
Client management

- Record notes
  --- Language
  --- Phone number
  --- Email
  --- Discounts

Scheduling

- Calendar
- Schedule an appointment

Treatment

- Summary
- Reminders
- Support multiple types of treatments
- Attach a google forms questionnaire

Observability

- Usage
