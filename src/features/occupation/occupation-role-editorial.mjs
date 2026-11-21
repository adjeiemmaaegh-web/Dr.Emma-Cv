/** Locally authored occupation-specific examples.
 * A focused set of exact job titles, not a claim that the entire catalog is
 * individually editorially reviewed. Examples are unverified until a user
 * selects and edits them. Nothing here implies a qualification or licence.
 */
const DATA={
 retail:[
 ['Store Manager','Store-management candidate focused on shop-floor standards, staff scheduling, stock availability and reliable trading controls.','Store Operations|Staff Scheduling|Cash Reconciliation','Planned shift coverage and daily priorities around customer demand.|Reviewed tills, stock variances and end-of-day handovers against store procedures.'],
 ['Cashier','Customer-facing cashier focused on accurate transactions, clear communication and orderly checkout service during busy periods.','Checkout Transactions|Till Reconciliation|Customer Queries','Processed customer payments and provided accurate receipts using the till system.|Balanced assigned checkout records and reported discrepancies through the correct process.'],
 ['Visual Merchandiser','Visual merchandising professional focused on clear product storytelling, practical store layouts and consistently maintained displays.','Display Planning|Planogram Execution|Product Presentation','Installed seasonal displays following the approved visual brief.|Checked signage, pricing and product placement throughout the trading day.']
 ],
 hospitality:[
 ['Barista','Barista candidate focused on consistent drink preparation, guest care and safe, efficient operation of a busy coffee service.','Espresso Preparation|Milk Steaming|Coffee Station Hygiene','Prepared customer drinks to the agreed recipe and presentation standard.|Cleaned coffee equipment and replenished consumables between service periods.'],
 ['Chef','Kitchen professional focused on organised preparation, consistent food quality and safe coordination across busy service periods.','Menu Preparation|Food Safety|Kitchen Station Coordination','Prepared dishes against menus, recipes and agreed portion specifications.|Organised mise en place and communicated timing with colleagues during service.'],
 ['Hotel Receptionist','Front-desk professional focused on courteous guest arrivals, accurate reservations and clear coordination with housekeeping teams.','Guest Check-in|Reservation Handling|Front Desk Systems','Processed guest arrivals and departures while checking reservation details.|Escalated room readiness and guest service requests to the appropriate teams.']
 ],
 warehouse:[
 ['Picker Packer','Warehouse order-fulfilment professional focused on accurate picking, careful packaging and reliable dispatch preparation.','Order Picking|Barcode Scanning|Packing Accuracy','Picked order lines against location and quantity instructions.|Checked packaging, labels and order completeness before dispatch handover.'],
 ['Forklift Operator','Forklift operator focused on careful load movement, equipment checks and safe coordination with warehouse colleagues.','Forklift Pre-use Checks|Load Handling|Warehouse Traffic Awareness','Performed pre-use equipment checks and reported defects before operation.|Moved palletised stock between designated locations following site traffic rules.'],
 ['Inventory Controller','Inventory control professional focused on accurate stock records, discrepancy investigation and dependable count procedures.','Cycle Counting|Inventory Reconciliation|Stock Records','Reconciled physical counts with recorded inventory movements.|Investigated stock variances and documented adjustments for authorisation.']
 ],
 manufacturing:[
 ['Production Operative','Production operative focused on following work instructions, checking product quality and maintaining an organised line.','Assembly Instructions|Production Line Checks|Material Preparation','Prepared materials and workstations before scheduled production runs.|Flagged damaged or non-conforming items using the site reporting process.'],
 ['CNC Operator','CNC machining candidate focused on careful setup checks, drawing interpretation and systematic dimensional inspection.','CNC Setup Checks|Engineering Drawings|Dimensional Inspection','Checked machine setup and workholding against approved job instructions.|Measured finished components and recorded deviations for review.'],
 ['Quality Inspector','Quality inspection professional focused on traceable checks, clear defect records and careful interpretation of specifications.','Quality Inspection|Defect Classification|Inspection Records','Inspected samples against documented acceptance requirements.|Recorded non-conformances and separated affected items for review.']
 ],
 construction:[
 ['Bricklayer','Bricklaying candidate focused on accurate setting-out, neat masonry work and safe preparation of materials on site.','Masonry Setting-out|Mortar Preparation|Brick and Block Laying','Set out masonry work to the drawings and agreed levels.|Prepared and laid bricks or blocks while checking alignment and finish.'],
 ['Site Supervisor','Construction site supervision professional focused on daily work coordination, clear safety briefings and progress tracking.','Site Coordination|Daily Briefings|Progress Reporting','Coordinated work sequences and communicated access requirements to trades.|Reported site progress and safety issues to project management.'],
 ['Quantity Surveyor','Quantity surveying professional focused on measured work, cost documentation and transparent commercial reporting.','Measurement and Take-offs|Cost Tracking|Contract Administration','Prepared quantity measurements from drawings and project records.|Tracked variations and supporting documentation for commercial review.']
 ],
 trades:[
 ['Electrician','Electrical trades professional focused on interpreting wiring information, orderly installation and safe testing procedures.','Electrical Installation|Circuit Testing|Wiring Diagrams','Installed electrical components to approved drawings and site instructions.|Recorded inspection results and raised defects before handover.'],
 ['Plumber','Plumbing trades professional focused on practical pipework installation, fault diagnosis and tidy worksite handovers.','Pipework Installation|Leak Diagnosis|Plumbing Fixtures','Installed or replaced plumbing fixtures according to job instructions.|Inspected joints and reported leaks or faults before closing work areas.'],
 ['Welder','Welding candidate focused on careful joint preparation, consistent weld quality and safe workshop practices.','Joint Preparation|Welding Processes|Weld Inspection','Prepared metal joints and checked workpieces against fabrication instructions.|Inspected completed welds visually and reported defects for correction.']
 ],
 driving:[
 ['Delivery Driver','Delivery driver focused on dependable route preparation, careful handling of goods and accurate delivery records.','Route Planning|Proof of Delivery|Vehicle Checks','Completed vehicle walk-around checks before assigned journeys.|Verified parcels and recorded deliveries or customer exceptions accurately.'],
 ['HGV Driver','Heavy goods driving professional focused on journey checks, load documentation and safe, reliable transport operations.','Load Security|Journey Planning|Vehicle Defect Reporting','Checked load restraint and required documentation before departure.|Recorded vehicle defects and delivery exceptions through company procedures.'],
 ['Bus Driver','Passenger transport candidate focused on safe scheduled services, clear passenger communication and vehicle readiness.','Passenger Assistance|Route Timetables|Vehicle Safety Checks','Operated scheduled routes with attention to passenger boarding and traffic conditions.|Reported vehicle or service issues promptly to the transport controller.']
 ],
 office:[
 ['Receptionist','Reception professional focused on welcoming visitors, handling incoming enquiries and keeping appointments organised.','Visitor Reception|Call Handling|Appointment Scheduling','Greeted visitors and directed requests to the correct person or department.|Maintained appointment information and handled incoming calls professionally.'],
 ['Executive Assistant','Executive support professional focused on calendar coordination, clear correspondence and discreet handling of priorities.','Executive Calendar Management|Meeting Coordination|Confidential Correspondence','Coordinated meetings, agendas and diary changes for senior stakeholders.|Prepared correspondence and tracked follow-up actions after meetings.'],
 ['Data Entry Clerk','Data-entry professional focused on accurate records, consistent data formats and careful checking before submission.','Data Accuracy|Spreadsheet Entry|Record Validation','Entered information into approved systems using consistent field formats.|Checked records for duplicates or missing data and referred exceptions for review.']
 ],
 finance:[
 ['Accountant','Accounting professional focused on reconciled records, clear reporting and disciplined month-end processes.','General Ledger Reconciliation|Financial Statements|Month-end Close','Prepared ledger reconciliations and documented unresolved balances.|Supported period-end reporting with checked schedules and source records.'],
 ['Bookkeeper','Bookkeeping professional focused on accurate transaction records, organised supporting documents and timely reconciliations.','Transaction Posting|Bank Reconciliation|Bookkeeping Software','Recorded sales, purchases and payments against source documents.|Reconciled bank movements and investigated differences in transaction records.'],
 ['Payroll Administrator','Payroll administration professional focused on careful pay-data checks, confidential records and accurate processing timelines.','Payroll Data Validation|Timesheet Checking|Payroll Records','Checked timesheet and pay-change inputs before payroll processing.|Responded to routine payroll queries while protecting sensitive employee information.']
 ],
 healthcare:[
 ['Registered Nurse','Nursing professional focused on patient-centred communication, accurate clinical documentation and coordinated care planning.','Clinical Documentation|Care Planning|Patient Communication','Recorded patient observations and escalated changes using clinical procedures.|Coordinated care updates with the relevant multidisciplinary team.'],
 ['Healthcare Assistant','Healthcare support professional focused on respectful daily assistance, clear observations and reliable escalation to qualified staff.','Personal Care Support|Patient Observation|Infection Prevention','Assisted with daily care tasks under the applicable care plan and supervision.|Reported changes in comfort or wellbeing to the responsible clinician.'],
 ['Physiotherapist','Physiotherapy professional focused on functional assessment, rehabilitation planning and clear patient guidance.','Functional Assessment|Exercise Planning|Patient Education','Supported rehabilitation plans by documenting functional progress.|Explained prescribed exercises and checked understanding during appointments.']
 ],
 education:[
 ['Teacher','Teaching professional focused on structured lesson preparation, inclusive classroom practice and meaningful feedback.','Lesson Planning|Classroom Management|Learning Assessment','Planned learning activities against curriculum and class needs.|Reviewed student work and adjusted instruction based on observed progress.'],
 ['Teaching Assistant','Classroom support professional focused on helping learners follow instructions and supporting inclusive daily routines.','Classroom Support|Learning Resources|Learner Assistance','Prepared teaching resources and supported small-group learning activities.|Shared learner observations with the supervising teacher.'],
 ['Tutor','Tutor focused on clear one-to-one explanations, purposeful practice and feedback linked to individual learning goals.','One-to-one Teaching|Learning Gap Assessment|Progress Feedback','Prepared practice activities aligned with an individual learner’s needs.|Reviewed practice responses and explained next steps for improvement.']
 ],
 security:[
 ['Security Guard','Security professional focused on vigilant site patrols, access checks and accurate incident reporting.','Site Patrols|Access Verification|Incident Reports','Completed scheduled patrols and recorded unusual observations promptly.|Checked access permissions and escalated incidents to the responsible team.'],
 ['CCTV Operator','CCTV monitoring candidate focused on attentive camera observation, timestamped incident notes and evidence-handling procedures.','Camera Monitoring|Incident Logging|Video Evidence Handling','Monitored assigned camera views and documented events using accurate timestamps.|Escalated suspicious activity for human review without assuming wrongdoing.'],
 ['Loss Prevention Officer','Retail loss-prevention professional focused on stock-risk observations, fair incident documentation and coordinated store safety.','Retail Loss Prevention|Incident Documentation|Stock Risk Awareness','Observed stock handling and checkout activity for procedural anomalies.|Recorded factual observations and referred concerns for authorised review.']
 ],
 cleaning:[
 ['Cleaner','Cleaning professional focused on consistent room standards, safe handling of supplies and orderly daily routines.','Cleaning Checklists|Surface Cleaning|Supply Replenishment','Cleaned assigned rooms, washrooms and shared areas against site checklists.|Replenished supplies and reported faults or shortages after cleaning rounds.'],
 ['Office Cleaner','Office cleaning candidate focused on discreet workstation cleaning, shared-area hygiene and reliable out-of-hours routines.','Office Hygiene|Workstation Cleaning|Waste Collection','Cleaned desk areas and shared office facilities around agreed access times.|Separated waste and restocked common-area consumables according to site requirements.'],
 ['Hotel Cleaner','Hotel housekeeping professional focused on room presentation, guest privacy and clear room-readiness handovers.','Guest Room Preparation|Linen Handling|Room Inspection','Prepared guest rooms against housekeeping presentation standards.|Reported room faults and updated readiness status for front-desk coordination.'],
 ['Cleaning Supervisor','Cleaning team supervisor focused on shift coverage, checklist quality and timely escalation of site issues.','Cleaning Quality Audits|Shift Allocation|Consumables Planning','Assigned cleaning areas and reviewed completed task checklists.|Checked standards and raised supply or maintenance issues with site management.']
 ],
 technology:[
 ['Software Developer','Software development professional focused on maintainable implementation, code review and clear test evidence.','Application Development|Version Control|Automated Testing','Implemented features against documented requirements and reviewed changes for maintainability.|Added tests and investigated reported defects before release.'],
 ['IT Support Technician','IT support professional focused on structured troubleshooting, user communication and accurate ticket records.','Helpdesk Troubleshooting|Device Configuration|Ticket Management','Diagnosed user-reported hardware or software incidents and documented resolution steps.|Configured approved devices and escalated unresolved issues through the support queue.'],
 ['Data Analyst','Data analysis professional focused on reliable data preparation, reproducible reporting and actionable presentation of findings.','Data Cleaning|SQL Queries|Dashboard Reporting','Validated source data and documented exclusions before analysis.|Prepared reports that explain trends and data limitations clearly.'],
 ['Cyber Security Analyst','Cybersecurity analyst focused on responsible alert triage, investigation records and evidence-based risk communication.','Security Alert Triage|Log Analysis|Incident Documentation','Reviewed security alerts against available logs and documented supporting indicators.|Escalated confirmed anomalies using established incident response procedures.']
 ],
 creative:[
 ['Graphic Designer','Graphic designer focused on clear visual hierarchy, accurate brand application and production-ready assets.','Brand Identity|Layout Design|Design Handoffs','Developed visual layouts aligned with briefs and approved brand guidelines.|Prepared design files for review and checked final asset specifications.'],
 ['UX Designer','User-experience designer focused on understandable workflows, accessible interfaces and evidence-led iteration.','User Research|Interaction Design|Usability Testing','Mapped user journeys and converted observed needs into interface concepts.|Tested prototype flows and incorporated documented user feedback.'],
 ['Social Media Manager','Social media professional focused on consistent content planning, audience interaction and transparent performance reporting.','Content Calendar Planning|Community Management|Channel Analytics','Planned social posts against campaign goals and publication schedules.|Reviewed channel metrics and recorded engagement patterns for improvement.'],
 ['Video Editor','Video editor focused on pacing, narrative clarity and reliable export settings across multiple delivery formats.','Video Editing|Audio Synchronisation|Export Quality Control','Assembled footage and audio into clear sequences following a project brief.|Checked captions, sound balance and export specifications before delivery.']
 ]
};
const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const entries=[];
for(const [group,rows] of Object.entries(DATA)){
 for(const [title,summary,skills,duties] of rows){
  entries.push(Object.freeze({group,title,summaries:Object.freeze([summary]),
   skills:Object.freeze(skills.split('|')),duties:Object.freeze(duties.split('|'))}));
 }
}
const LOOKUP=new Map(entries.map(entry=>[normalize(entry.title),entry]));
export const EDITORIAL_ROLE_TITLES=Object.freeze(entries.map(r=>r.title));
export function roleEditorialFor(role,group){
 const found=LOOKUP.get(normalize(role));
 return found&&found.group===group?found:null;
}
