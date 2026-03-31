# AI Virtual Receptionist for WhatsApp - Functional Description

## Product Overview

**Product Type**: AI-powered WhatsApp virtual receptionist system for service-based businesses
**Industry**: Aesthetics / Wellness / Spa / Massage Centers
**Technology Stack**: n8n workflow automation, OpenAI GPT-4.1-mini, WhatsApp Business API (YCloud), Telegram Bot API, Google Sheets, Google Docs
**Deployment**: Cloud-hosted (Railway)

---

## What This System Does

### 1. Automated Customer Reception via WhatsApp

- **24/7 Availability**: Responds to incoming WhatsApp messages at any time without human intervention
- **Natural Conversation**: Uses AI (GPT-4.1-mini) to maintain natural, contextual conversations in Argentine Spanish (voseo dialect)
- **Conversation Memory**: Maintains context across messages with a 30-message conversation history per customer
- **Message Batching**: Intelligently waits 7 seconds to batch rapid successive messages before responding, preventing fragmented replies

### 2. Customer Identification & Registration

- **Returning Customer Recognition**: Automatically looks up customers by phone number in a database
- **Personalized Greetings**: Greets returning customers by name
- **New Customer Registration**: Collects name and surname from new customers and registers them in the database
- **Idempotent Registration**: Prevents duplicate customer entries through phone number matching

### 3. General Inquiry Handling

- **Knowledge Base Integration**: Queries a Google Doc knowledge base to answer questions about:
  - Services offered
  - Pricing
  - Business hours
  - Location and address
  - Staff/masseuse information
- **Dynamic Responses**: Generates natural language responses based on retrieved information
- **Website Referral**: Redirects to the business website when information is not available

### 4. Masseuse Availability Lookup

- **Schedule Database**: Queries a Google Sheets-based staff schedule
- **Search by Day**: "Who is available today/tomorrow/Monday?"
- **Search by Staff Member**: "When does [name] work?"
- **Contextual Date Handling**: Automatically converts relative dates (today, tomorrow) to actual days based on Argentina timezone (GMT-3)
- **Natural Language Responses**: Generates friendly responses listing available staff or working days

### 5. Appointment Intent Detection & Human Handoff

- **Intent Recognition**: Detects when a customer wants to book an appointment through various phrases:
  - Direct requests: "I want to book an appointment"
  - Implicit intent: "Can I come by in 10 minutes?", "I'm nearby, is anyone available?"
- **Intelligent Handoff**: When appointment intent is detected:
  - Sends a brief holding message to the customer
  - Immediately notifies staff via Telegram with full context
  - Adds customer to a temporary blacklist so the bot doesn't interfere
  - Provides staff with a direct WhatsApp link to continue the conversation
- **Conversation Context Preservation**: Passes relevant context (services mentioned, preferences) to staff

### 6. Audio Message Handling

- **Audio Detection**: Identifies when customers send voice messages
- **Staff Notification**: Since audio cannot be transcribed, immediately notifies staff via Telegram with:
  - Customer name (if known) or "new customer" indicator
  - Phone number
  - Conversation context summary
  - Direct WhatsApp link
- **Automatic Handoff**: Temporarily removes customer from bot handling until staff resolves

### 7. Staff Control Panel (Telegram)

- **Bot Status Control**:
  - `#on` - Activate the bot globally
  - `#off` - Deactivate the bot globally (no automatic responses)
  - `#info` - Check current bot status
- **Customer Blacklist Management**:
  - `#blacklist <phone>` - Manually exclude a customer from bot responses
  - `#unblacklist <phone>` - Re-enable bot responses for a customer
- **Real-time Notifications**: Staff receive Telegram alerts for:
  - Appointment requests
  - Audio messages
  - Situations requiring human intervention

### 8. Bot Reactivation System

- **One-Click Reactivation**: After staff completes handling a customer, they click a unique URL to:
  - Remove the customer from the temporary blacklist
  - Update the request tracker status
  - Edit the original Telegram notification to show "Completed"
  - Re-enable automated responses for that customer
- **Request Tracking**: Maintains a log of all handoff requests with status (pending/completed)

### 9. Self-Message Filtering

- **Echo Prevention**: Automatically ignores messages sent from the business's own WhatsApp number
- **Prevents Loops**: Ensures the bot doesn't respond to its own messages or staff messages sent through the business account

---

## What This System Does NOT Do

### 1. Does NOT Book Appointments Automatically

- The system detects appointment intent but does NOT access calendars or booking systems
- Does NOT check real-time availability of time slots
- Does NOT confirm or create bookings
- All appointment scheduling is handed off to human staff

### 2. Does NOT Process Payments

- No payment gateway integration
- No invoice generation
- No transaction processing

### 3. Does NOT Handle Image Messages

- Image messages are detected but not processed
- No image analysis or OCR capabilities
- Images are effectively ignored (not handed off to staff)

### 4. Does NOT Transcribe Audio Messages

- Voice messages cannot be converted to text
- Requires human staff to listen and respond
- Automatic handoff occurs but content is not analyzed

### 5. Does NOT Integrate with Calendar/Booking Systems

- No Google Calendar integration
- No booking software integration (Calendly, Acuity, etc.)
- No real-time slot availability checking
- Schedule data is static (manual Google Sheets updates required)

### 6. Does NOT Support Multiple Businesses

- Single-tenant architecture
- Hardcoded for one business (Punto Relax Hombres)
- Knowledge base, schedules, and configuration are business-specific

### 7. Does NOT Provide Analytics or Reporting

- No conversation analytics dashboard
- No customer engagement metrics
- No response time tracking
- No conversion tracking (inquiries to appointments)

### 8. Does NOT Support Multiple Languages

- Spanish only (Argentine dialect)
- No language detection
- No automatic translation

### 9. Does NOT Handle Complex Inquiries

- Cannot answer questions outside the knowledge base
- Does not perform calculations (e.g., package pricing combinations)
- Cannot handle complaints or disputes (should be manually configured for handoff)

### 10. Does NOT Have Proactive Outreach

- No appointment reminders
- No follow-up messages
- No marketing/promotional messaging
- No abandoned conversation recovery

### 11. Does NOT Manage Staff Schedules

- Staff availability is read-only from Google Sheets
- No interface for staff to update their own schedules
- No shift management features

---

## System Architecture Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Workflow Engine | n8n (self-hosted) | Orchestrates all automation logic |
| AI Model | OpenAI GPT-4.1-mini | Natural language understanding and generation |
| WhatsApp Integration | YCloud API | Send/receive WhatsApp messages |
| Staff Interface | Telegram Bot | Control panel and notifications |
| Customer Database | Google Sheets | Store customer records |
| Knowledge Base | Google Docs | Store business information |
| Staff Schedule | Google Sheets | Masseuse availability by day |
| State Management | n8n DataTables | Blacklist, request tracking, bot status |
| Hosting | Railway | Cloud deployment |

---

## Operational Requirements

- **WhatsApp Business Account**: Required with YCloud API access
- **Telegram Bot**: Required for staff notifications and control
- **Google Workspace**: For Sheets and Docs integration
- **n8n Instance**: Self-hosted or cloud instance
- **OpenAI API Key**: For AI model access
- **Manual Maintenance**: Knowledge base and staff schedules require manual updates

---

## Target Use Case

This system is designed for **small to medium service-based businesses** (1-10 staff members) that:

- Receive high volumes of WhatsApp inquiries
- Need 24/7 response capability
- Want to automate FAQ responses
- Prefer human handling for actual bookings
- Have a small, non-technical staff that can use Telegram
- Operate primarily in Spanish-speaking markets (Argentina)

---

## Version

**Current Version**: v7.6.5
**Features**: Simple architecture, availability lookup feature, YCloud integration
