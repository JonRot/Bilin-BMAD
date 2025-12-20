# Business Context & Current Operations

**Company:** BILIN Method - In-Home English Language Education
**Location:** Florianópolis, Santa Catarina, Brazil
**Date:** 2025-11-27
**Status:** Detailed operational analysis

---

## 🇧🇷 Business Overview

### What We Do
- In-home English language instruction for children in Brazil
- Teachers travel house-to-house using the proprietary **BILIN Method**
- Teaching in the comfort and security of the child's home (competitive differentiator)
- Fun, confidence-building approach to language learning

### Current Scale
- **67 active students** + 18 new students + 4 testing = **89 total students**
- **12 teachers** (10 English in-person, 1 Spanish, 1 online English for adults)
- **41 people on waitlist** (16 in Florianópolis, 25 in other cities)
- **2-3 new registrations per week**

### Geographic Coverage
**Currently Serving:**
- Florianópolis (main market)
- Many neighborhoods covered, but not all

**Waitlist by City:**
- Florianópolis: 16
- São Paulo: 11
- Curitiba: 7
- Palhoça: 3
- Joinville: 2
- Biguaçu: 1
- Itapema: 1

**Expansion Targets:**
- Londrina
- Balneário Camboriú
- Considering franchise model for future

---

## 💰 Business Model

### Pricing Structure

**In-Person Classes:**
- **Individual class:** R$150/class
  - Teacher receives: R$95
  - Company receives: R$55 (37% margin)
- **Group class:** R$120/student
  - Teacher receives: R$70/student
  - Company receives: R$50/student

**Online Classes:**
- **Online (Brazil/National):**
  - Teacher receives: R$60/class
  - Company receives: TBD
- **Online (International):**
  - Teacher receives: R$80/class
  - Company receives: TBD

### Contract Types
1. **Trial:** 1 month test period
2. **6-month contract:** 10% discount
3. **No deadline:** Ongoing, flexible

### Payment Methods
- **PIX** (primary)
- **Boleto**
- **No recurring billing yet** (due to cancellation flexibility)
- **Monthly invoicing** (manual)
- Late payment fees applied when needed

### Cancellation Policy
- **24 hours notice:** Free cancellation, no charge
- **2 hours notice:** Client charged for class
- **Student sick:** Not charged (company accepts as valid excuse)
- **Flexibility is key:** Company tries to be reasonable and accommodate

### Teacher Payment
- **R$95 per individual class**
- **R$75 per student in group class**
- **Monthly payment** (paid on time, teachers don't complain)
- Teachers track classes taught and submit to finance
- Company contracts teachers as **MEI (individual contractors)**, not employees

---

## 📊 Current Tech Stack & Tools

### Google Sheets (Multiple)
1. **Schedule Teacher Weekly Sheet**
   - Weekly teacher schedules and assignments
   - Updated by admin/secretary
   - Manual conflict checking

2. **Contracted Status & Processing Sheet**
   - Client journey tracking (Registration → Trial → Contracted → Active)
   - Payment status tracking
   - Contract status

3. **Registration (Potential Client) Sheet**
   - New lead information from JotForms
   - Auto-populated from form submissions

4. **Waiting List Sheet**
   - Clients waiting for teacher availability or location coverage
   - Reasons: No teacher available, wrong location
   - Wait time: 1-4 months (some longer)

5. **Teacher Data Sheet**
   - Personal information
   - Class preferences (student ages, languages, cities willing to teach)
   - Availability calendar (time slots filled as scheduled)
   - Admin updates, encouraged to open more availability

### JotForms
- **Registration forms** feeding into Google Sheets
- **Collects:** Name, email, phone, location, class preferences, time frames, allergy issues, student information

### Communication Tools
- **WhatsApp** (primary communication in Brazil)
  - 20-30 hours/week actively dealing with problems
  - WhatsApp Business account
  - Templates for common questions (pricing, availability, policies)
  - Used for: parent communication, teacher coordination, problem resolution

- **Instagram** (marketing & outreach)
  - Daily posts
  - Stories showing teachers in homes teaching kids
  - Main lead generation source (plus word-of-mouth)
  - DMs asking about availability and pricing

### Project Management
- **Trello** for organizing ideas and projects

---

## 🔥 Major Pain Points (Detailed)

### #1: Manual Teacher-Student Matching (BIGGEST TIME SINK)

**Current Process:**
1. Parent submits registration with:
   - Location (neighborhood/address)
   - Time preferences (e.g., "Monday 9-11am, Tuesday 9am-2pm, Friday 8am-11am")
   - Student information (age, preferences)
   - Special needs/allergies

2. Secretary manually evaluates:
   - Which teachers are available in those time frames?
   - Which teachers teach that student's age range?
   - Which teachers live near that location?
   - OR which teachers have existing students nearby on that day? (complex routing calculation)
   - Does student fit teacher's preferences?

3. Contact parent to confirm slot works
4. Contact teacher to confirm slot works
5. Create contract
6. Update all relevant sheets

**Time Required:** 1-2 days per match (when straightforward)

**Complexity:** Sometimes only 1 option, sometimes need to move existing students to make new one fit

**Volume:** 2-3 new registrations per week, plus ongoing rescheduling

---

### #2: Rescheduling Chaos & Double-Booking Risk (HIGHEST RISK)

**What Happens Daily:**
- Parents call in sick for student
- Parents traveling, something came up
- Parents cancel class
- Parents request reschedule to different day or longer day

**Company Approach:**
- Try to reschedule to preserve teacher income (fair to teacher)
- Be flexible and reasonable with client
- But this creates complexity...

**The Problem:**
- Class rescheduled to new time
- New student added same week
- Sheets not updated fast enough
- **RESULT: Double-booking**
- "Things can be hard to track at times"

**Teacher Sick = MAJOR CRISIS:**
- Need to cancel OR reschedule ALL of teacher's classes
- Impacts multiple families
- High coordination overhead

---

### #3: WhatsApp Communication Overload (20-30 HRS/WEEK)

**Time Spent:**
- 20-30 hours/week actively dealing with problems on WhatsApp
- Checking sheets constantly
- Multiple conversations happening simultaneously

**Communication Challenges:**
- Sometimes forget to notify someone
- Multiple people in conversations, some miss context
- Admins sometimes forget to do something, then scramble to fix it
- Try to separate personal/business (8am-7pm response window)

**What Takes Time:**
- Talking to parents (most time-consuming)
- Dealing with parent/teacher problems
- Rescheduling negotiations
- Teacher delays or parents canceling when teacher almost at house
- Answering repetitive questions (despite templates)

---

### #4: Not Enough Teachers (GROWTH BOTTLENECK)

**Current Capacity:**
- 12 teachers for 89 students = 7.4 students/teacher average
- **41 people on waitlist** (can't serve due to no teacher availability or location)
- Can't take 50 new registrations (would break operations)

**Teacher Recruitment:**
- Background check (mental stability, can handle kids and visiting homes)
- Experience with teaching kids required
- Training session with CEO on BILIN Method
- Fastest onboarding: 3-4 days
- Typical: 1-2 weeks
- **Challenge:** Need to ensure teacher commitment (not quit after few weeks)
- **Need:** More teacher candidates

**Teacher Retention:**
- Used to have attrition issues (greed, busy lives)
- Now more stable but need to grow supply

**Teacher Transportation Challenge:**
- Most teachers don't have cars
- Use bus to get to teaching zones
- Need to cluster classes in same area for efficiency
- Teachers sometimes take bus to location, teach full day in that general area
- Makes area coverage planning critical

---

### #5: Waitlist Management (LOST OPPORTUNITY)

**Current Waitlist:** 41 people
- **16 in Florianópolis** (can potentially serve but no teacher availability)
- **25 in other cities** (can't serve yet - Curitiba, São Paulo, Joinville, etc.)

**Why on Waitlist:**
- Mostly location (no teacher in that neighborhood)
- Some due to no teacher availability in preferred time
- Some in different cities entirely

**Wait Time:** 1-4 months, some have waited longer

**Lost Conversions:**
- "Sometimes we lose people but there is not much we can do"
- Check list occasionally to see if something changed
- No proactive outreach when teacher becomes available

**Opportunity:**
- Waitlist shows WHERE to recruit teachers
- Shows demand in expansion cities (São Paulo: 11!)
- Could prioritize teacher recruitment by waitlist concentration

---

### #6: Manual Class Tracking & Billing

**Current Process:**
1. Teachers teach classes throughout month
2. Teachers manually track classes taught
3. Teachers send list to financial person
4. Financial person bills parents manually
5. Parents pay via PIX or Boleto
6. Financial person pays teachers monthly

**Issues:**
- Manual tracking prone to errors (rarely happens but possible)
- Parents sometimes pay late (add fees)
- Can't do recurring billing due to cancellation flexibility
- Finance person has to manually calculate each month

**Teacher Payment:**
- Monthly payment, always on time
- Teachers don't complain about accuracy or timing
- But manual process doesn't scale

---

### #7: Data Entry & Sheet Maintenance

**WhatsApp Takes Long Time:**
- Constantly checking sheets
- Not huge time on data entry but combined with WhatsApp = hours daily

**Registration Issues:**
- Sometimes location has spelling errors (one letter wrong)
- JotForms feeds sheets automatically (helps a lot)
- Secretary keeps sheets very updated

**Sheet Synchronization:**
- Multiple sheets need to stay in sync
- Risk of sheets being out of sync during busy periods
- No automatic conflict detection

---

### #8: Profitability Challenge

**Current State:**
- "Not very profitable at the moment"
- R$55/class margin (37%) sounds good but thin when accounting for:
  - Admin time (20-30 hrs/week on WhatsApp)
  - Marketing costs
  - Materials
  - Overhead

**Constraints:**
- Can't raise prices (market competitive)
- Can't lower teacher pay (would cause teachers to leave)
- Need efficiency improvements to increase margin

**Success Metric:**
- Improve profit margin
- More teachers would help (spread fixed costs)
- Efficiency gains would help (reduce admin overhead)

---

## 🎯 Current Workflows (Detailed)

### New Client Onboarding Workflow

**Step 1: Discovery**
- Parent finds company via Instagram or word-of-mouth
- Sends DM or fills out JotForm registration

**Step 2: Registration**
- JotForm collects:
  - Parent name, email, phone
  - Student name, age
  - Location (address/neighborhood)
  - Time preferences (day/time frames)
  - Allergies or special needs
  - Language preference
- Auto-populates Google Sheet

**Step 3: Availability Check**
- Secretary reviews registration
- Checks if can serve (location + availability)
- If NO: Add to waitlist, notify parent via WhatsApp
- If YES: Proceed to matching

**Step 4: Teacher Matching**
- Secretary manually evaluates teachers:
  - Check teacher availability in requested times
  - Check teacher teaches that age range
  - Check teacher location or existing route proximity
  - Check teacher preferences match student
- Identify 1-3 possible teacher options
- Sometimes need to ask teacher to open schedule
- Sometimes need to move existing student to make it work

**Step 5: Confirmation**
- Contact parent: "We have Teacher Maria available Monday 10am, does that work?"
- Contact teacher: "New student João, Monday 10am at [address], can you take this?"
- Both confirm

**Step 6: Contract**
- Create 1-month trial contract
- Parent signs
- Add to schedule sheets
- Update teacher availability sheet

**Step 7: First Class**
- Teacher teaches trial classes
- Parent evaluates fit

**Step 8: Extension**
- After 1 month, offer:
  - 6-month contract (10% discount)
  - OR no deadline (flexible, ongoing)
- Most parents choose flexible

**Timeline:** 1-2 days if straightforward, longer if complex

---

### Daily Operations Workflow

**Morning (8am):**
- Check WhatsApp messages from overnight
- Respond to parent questions
- Handle any overnight cancellations or issues

**Throughout Day:**
- Parents cancel/reschedule (happens daily)
- Secretary negotiates reschedule options
- Updates sheets
- Notifies teacher of changes
- Monitors for conflicts

**Teacher Issues:**
- Teacher running late: Notify parent
- Teacher sick: Crisis mode (cancel or reschedule all classes)
- Teacher requests schedule change: Evaluate impact

**New Registrations:**
- 2-3 per week
- Evaluate if can serve
- Begin matching process

**Evening (7pm):**
- Stop responding to parents (personal time boundary)
- Prepare for next day

---

### Monthly Billing Workflow

**End of Month:**
1. Each teacher submits list of classes taught
2. Financial person reviews submissions
3. Financial person creates invoices for parents
4. Sends invoices via WhatsApp
5. Parents pay via PIX or Boleto
6. Track payments
7. Follow up on late payments (add fees)
8. Calculate teacher earnings
9. Pay teachers monthly

**Issues:**
- Manual process, doesn't scale
- Prone to disputes if tracking wrong
- Can't do recurring billing (due to flexibility promise)

---

## 🏆 Competitive Advantages

### What Makes BILIN Different

**1. In-Home Teaching**
- Most competition = take kids to school/center
- BILIN = teacher comes to home
- **Benefits:**
  - Convenience for parents (no transportation)
  - Security (child safe at home)
  - Comfort (familiar environment)
  - "Purple cow" differentiator

**2. BILIN Method**
- Proprietary teaching methodology created by CEO
- Fun, engaging approach
- Builds confidence in kids
- Proven results

**3. Low Competition**
- Few competitors doing in-home English teaching in Florianópolis
- Different from traditional language schools
- Different from online-only platforms

**4. Strong Marketing**
- Daily Instagram posts and stories
- Shows real teachers, real kids, real homes
- Word-of-mouth referrals
- Community events
- Building "BILIN community" brand

---

## 📈 Growth Vision

### Short-term (6-12 months)
- Recruit more teachers in Florianópolis
- Cover more neighborhoods
- Serve the 16 people on Florianópolis waitlist
- Improve operational efficiency
- Improve profit margins

### Medium-term (1-2 years)
- Expand to Londrina
- Expand to Balneário Camboriú
- Test other cities on waitlist (Curitiba, São Paulo)
- Grow to 25-50 teachers
- Systematize operations for scale

### Long-term (2+ years)
- Franchise model
- Multiple cities with local franchisees
- Scale BILIN Method nationally
- Become known brand for in-home language education

---

## 💡 Technology Comfort & Adoption

### Teachers
- Comfortable with technology
- Want to keep things simple
- Can handle app/platform if intuitive

### Parents
- **Not usually tech-savvy**
- Primary concern: Know what's being taught
- Want feedback on child's progress
- Want transparency on learning
- Would use app if simple enough

### Key Concern
- "I worry about investing in something that might not be used by anyone"
- **MUST be simple** to get adoption
- WhatsApp is comfort zone (everyone uses it)

---

## 🚨 Critical Success Factors

### What Would Make Biggest Impact?

**CEO's Vision:**
- "An AI or something that will organize the problems for cancellations, reminders, notifications, rescheduling, etc."

**Secretary's Pain:**
- 20-30 hours/week on WhatsApp
- Manual matching process
- Forgetting to notify people
- Dealing with daily chaos

**Financial Person's Need:**
- Automated class tracking
- Easier billing process
- Recurring payments (if possible with flexibility)

**Teacher Needs:**
- Clear schedule
- Timely payment
- Efficient routing (less travel time)
- Ability to increase income (more students, less driving)

**Parent Needs:**
- Reliability (no double-bookings, teacher shows up)
- Transparency (know what's being taught)
- Convenience (easy to reschedule when needed)
- Communication (reminders, updates)

---

## ❓ Outstanding Questions for Follow-up

### Contract & Billing
1. Do clients actually commit to 6-month contracts or do most go no-deadline?
2. How do you track if cancellation is within 24h vs 2h? (Manual WhatsApp timestamps?)
3. Would monthly prepaid model work? (Pay upfront for 4 classes/month, can cancel 24h before with credit rollover)

### Teacher Economics
4. How many classes per week does average teacher teach?
5. Do teachers declare which neighborhoods they'll serve or assigned anywhere?
6. Do teachers pay their own bus fare? (Does this eat into R$95/class?)

### Growth
7. Where do you find teacher candidates? (Universities? Job sites? Word of mouth?)
8. For franchise model: separate franchisees per city with own teachers, or central management?

### Operations
9. Is the 20-30 hrs/week on WhatsApp ONE person or team? (Sounds unsustainable for one person!)
10. Of 2-3 registrations/week, how many actually convert to paying clients?

---

## 🎯 Platform Priorities (Based on Pain Points)

### MUST SOLVE (Phase 1 MVP)

**1. Teacher-Student Matching Assistant** (Save 10-15 hrs/week)
- Parent enters preferences
- System shows best teacher matches
- Consider: location, availability, age fit, existing routes
- Secretary approves (not fully automated yet)

**2. Conflict-Free Rescheduling** (Eliminate double-booking risk)
- Shows available alternative slots
- Prevents double-bookings automatically
- Preserves teacher income when possible

**3. Automated WhatsApp Notifications** (Save 10-15 hrs/week)
- Booking confirmations
- 24-hour reminders
- Cancellation notifications
- Rescheduling confirmations
- Uses WhatsApp Business API

**4. Class Tracking** (Enable future billing automation)
- Teachers mark completed classes
- Auto-calculate monthly earnings
- Finance reviews and bills

**5. Waitlist Management** (Capture demand)
- Track why on waitlist (location vs availability)
- Auto-notify when teacher available in their area
- Prioritize by wait time and location

### SHOULD HAVE (Phase 2)

**6. Payment Integration**
- PIX integration
- Boleto generation
- Late payment tracking
- Monthly teacher payout automation

**7. Parent Transparency**
- What's being taught (lesson notes)
- Student progress tracking
- Teacher feedback to parents

**8. Geographic Routing**
- Visual map of teacher's daily route
- "Bus route" optimization (cluster classes in area)
- Minimize travel time

**9. Teacher Recruitment Workflow**
- Application tracking
- Background check workflow
- Training schedule
- Onboarding checklist

### NICE TO HAVE (Phase 3)

**10. Client Self-Service Booking**
- Parents browse available teachers
- See real-time availability
- Book directly (with admin approval)

**11. Rating System**
- Teacher ratings and reviews
- Performance tiers
- Quality management

---

**Document Status:** Comprehensive business context captured
**Next Session:** Prioritize features and create detailed requirements
**Date Updated:** 2025-11-27
