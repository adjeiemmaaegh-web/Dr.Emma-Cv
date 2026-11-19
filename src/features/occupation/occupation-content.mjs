/** Occupation content library; local, deterministic, no network or AI. */
const ROLE_PROFILES = {
  retail: {
    bullets:[
      'Led daily operations for a busy retail team, maintaining high standards for service, availability, and presentation across the sales floor.',
      'Managed stock, replenishment, and visual merchandising so customers could find products quickly and the store stayed organised throughout the day.',
      'Handled cash, card, and returns accurately while resolving customer queries calmly and professionally under pressure.',
      'Coached colleagues on product knowledge and service standards, helping the team hit sales and conversion targets consistently.',
      'Opened and closed the store following security and cash-up procedures, reporting shortages or incidents without delay.',
      'Built regular customer relationships through helpful recommendations, which supported repeat visits and positive feedback.',
      'Monitored competitor activity and customer trends, feeding practical ideas into promotions and floor layouts.',
      'Supported recruitment and onboarding of new team members, demonstrating routines and service expectations clearly.'
    ],
    skills:['Customer Service','Cash Handling','Stock Control','Visual Merchandising','Team Leadership','Sales Targets','Product Knowledge','Conflict Resolution','POS Systems','Upselling'],
    summaries:[
      'Customer-focused retail professional with solid experience leading floor teams, improving service standards, and delivering reliable commercial results in fast-paced store environments.',
      'Practical retail supervisor experienced in stock control, visual merchandising, and coaching colleagues while keeping service, availability, and presentation consistently high.',
      'Results-driven retail assistant with a proven record of accurate cash handling, calm problem-solving, and building customer loyalty through clear product knowledge and approachable service.',
      'Organised retail team member trusted to open and close stores, manage replenishment, and support sales targets without compromising on service quality or security procedures.',
      'Confident retail professional skilled at turning busy trading periods into smooth customer experiences, mentoring new starters, and maintaining strong standards across the sales floor.',
      'Reliable retail operator with hands-on experience in merchandising, inventory accuracy, and customer care, comfortable taking ownership of daily tasks and supporting wider store goals.',
      'Engaging retail specialist who combines product expertise with strong interpersonal skills to guide customers, resolve issues promptly, and contribute to a positive store atmosphere.',
      'Motivated retail professional seeking to bring disciplined stock management, team collaboration, and a genuine focus on customer satisfaction to a progressive retail business.'
    ]
  },
  hospitality: {
    bullets:[
      'Delivered warm, efficient service during busy shifts while maintaining accuracy on orders, payments, and table or room standards.',
      'Prepared and presented food and drink to brand specification, working cleanly and safely in line with hygiene requirements.',
      'Handled guest complaints calmly, finding practical solutions that protected the guest experience and the reputation of the venue.',
      'Supported team members during peak periods, stepping into different roles as needed to keep service running smoothly.',
      'Kept service areas organised, stocked, and presentation-ready throughout the shift so guests received a consistent experience.',
      'Processed payments and billed accounts accurately, reconciling takings at the end of the shift with minimal discrepancies.',
      'Communicated clearly with kitchen and bar teams to coordinate timing, special requests, and dietary requirements.',
      'Welcomed guests, managed reservations or room allocations, and created a professional first impression for the venue.'
    ],
    skills:['Customer Service','Food Hygiene','Cash Handling','Teamwork','Communication','Time Management','Conflict Resolution','POS Systems','Attention to Detail','Guest Relations'],
    summaries:[
      'Hospitality professional with hands-on experience delivering high-quality guest service in busy restaurants, hotels, or bars while keeping standards and teamwork strong under pressure.',
      'Reliable front-of-house team member skilled at managing multiple tables or guests, handling payments accurately, and resolving issues with calm professionalism.',
      'Service-focused hospitality worker experienced in food hygiene, presentation standards, and coordinating with kitchen teams to deliver timely, consistent guest experiences.',
      'Adaptable hospitality professional comfortable working early, late, and peak shifts, supporting colleagues, and maintaining a polished venue appearance throughout service.',
      'Guest-centred hospitality specialist with a proven ability to turn complaints into positive outcomes and to uphold brand standards on every shift.',
      'Energetic hospitality team member who combines efficient service with genuine warmth, accurate order handling, and strong awareness of health and safety requirements.',
      'Organised hospitality professional trusted with cash handling, stock readiness, and smooth coordination between front and back of house during high-volume periods.',
      'Dedicated hospitality worker seeking to contribute reliable service skills, clear communication, and a consistent focus on guest satisfaction in a quality-led operation.'
    ]
  },
  warehouse: {
    bullets:[
      'Picked, packed, and despatched orders accurately against pick lists, meeting daily volume targets without compromising quality checks.',
      'Operated warehouse equipment safely, completing pre-use checks and reporting defects in line with site procedures.',
      'Maintained clear aisle organisation and stock locations so inventory could be found quickly and replenishment stayed efficient.',
      'Completed goods-in checks, verified quantities against delivery notes, and raised discrepancies with supervisors promptly.',
      'Followed health and safety rules for manual handling, PPE, and hazardous materials, contributing to a strong site safety record.',
      'Used handheld scanners and warehouse systems to update stock movements in real time and reduce inventory errors.',
      'Supported seasonal peaks by flexing across packing, sorting, and loading roles while keeping accuracy and pace consistent.',
      'Assisted with stock takes and cycle counts, investigating variances and helping keep system records aligned with physical stock.'
    ],
    skills:['Order Picking','Stock Control','Manual Handling','Health & Safety','RF Scanning','Teamwork','Accuracy','Time Management','Forklift Awareness','Inventory Management'],
    summaries:[
      'Reliable warehouse operative with experience in picking, packing, and despatch, focused on accuracy, safety, and meeting daily throughput targets in fast-moving environments.',
      'Practical warehouse team member skilled at goods-in checks, stock organisation, and using scanners or systems to keep inventory records up to date.',
      'Safety-conscious warehouse worker experienced in manual handling best practice, PPE compliance, and supporting peak periods without sacrificing quality.',
      'Organised warehouse professional trusted to maintain clean, efficient aisles, complete cycle counts, and escalate discrepancies before they affect customer orders.',
      'Hard-working warehouse operative comfortable operating basic equipment, following strict process, and collaborating with supervisors to hit shift KPIs.',
      'Detail-oriented warehouse team member with a strong record of accurate order fulfilment and consistent adherence to site health and safety standards.',
      'Adaptable warehouse worker able to move between picking, packing, and loading duties while keeping documentation and system updates accurate.',
      'Motivated warehouse professional seeking to bring dependable productivity, careful stock handling, and a proactive approach to safety to a busy distribution operation.'
    ]
  },
  manufacturing: {
    bullets:[
      'Operated production machinery to agreed quality and output standards, monitoring gauges and adjusting settings when required.',
      'Completed in-process quality checks, recording results and stopping the line promptly when defects were identified.',
      'Followed standard operating procedures and work instructions so every batch met specification and audit requirements.',
      'Maintained a clean, organised workstation and supported 5S or continuous improvement activities on the shop floor.',
      'Reported equipment faults early and assisted maintenance teams with changeovers or basic troubleshooting.',
      'Met daily production targets while working safely with PPE, lock-out procedures, and site risk assessments.',
      'Trained new team members on machine set-up, quality checkpoints, and safe working practices.',
      'Collaborated with supervisors and quality teams to reduce scrap, rework, and downtime across the shift.'
    ],
    skills:['Machine Operation','Quality Control','Health & Safety','SOP Compliance','Problem Solving','Teamwork','Continuous Improvement','Attention to Detail','Production Targets','PPE'],
    summaries:[
      'Manufacturing operative with solid experience running production lines to quality and output targets while maintaining strict health and safety standards.',
      'Detail-focused production worker skilled at in-process checks, SOP compliance, and stopping work early when quality risks appear.',
      'Reliable manufacturing team member experienced in machine operation, basic troubleshooting, and supporting continuous improvement on the shop floor.',
      'Safety-aware production professional trusted to meet shift targets, keep workstations organised, and train new starters on correct procedures.',
      'Practical manufacturing operative who combines careful quality monitoring with efficient pace and clear communication with supervisors and maintenance teams.',
      'Hands-on production worker with a proven record of reducing scrap and rework through disciplined process adherence and early fault reporting.',
      'Organised manufacturing professional comfortable with changeovers, documentation, and working as part of a multi-skilled production team.',
      'Motivated manufacturing operative seeking to apply dependable machine skills, quality awareness, and a continuous-improvement mindset in a modern production environment.'
    ]
  },
  construction: {
    bullets:[
      'Coordinated daily activities for site teams, keeping work packages on programme and communicating clearly with subcontractors and supervisors.',
      'Led toolbox talks and daily briefings, reinforcing method statements, permits, and site rules before work started.',
      'Checked completed work against drawings and specifications, raising defects early to reduce avoidable rework.',
      'Maintained housekeeping standards across work areas, supporting a strong safety culture and reducing trip and access risks.',
      'Organised materials, plant, and labour so tasks could start on time and downtime was kept to a minimum.',
      'Recorded progress, incidents, and variations accurately for site management and client reporting.',
      'Liaised with clients, inspectors, and other trades to sequence work safely and avoid clashes on shared access routes.',
      'Supported induction of new operatives, explaining site rules, emergency procedures, and expected quality standards.'
    ],
    skills:['Site Coordination','Health & Safety','Method Statements','Quality Checks','Toolbox Talks','Team Leadership','Drawing Reading','Housekeeping','Communication','Problem Solving'],
    summaries:[
      'Safety-focused construction professional with experience coordinating site teams, preparing work areas, and keeping projects moving to programme without compromising standards.',
      'Practical site supervisor skilled at toolbox talks, quality checks against drawings, and clear communication with subcontractors and site management.',
      'Reliable construction team member trusted to organise materials and labour, maintain housekeeping, and support a strong on-site safety culture.',
      'Hands-on construction professional experienced in reading drawings, controlling quality, and reducing rework through early defect identification.',
      'Organised site operative who combines practical trade awareness with disciplined record-keeping and proactive problem-solving under programme pressure.',
      'Construction professional with a proven ability to brief teams clearly, enforce method statements, and keep multi-trade work sequenced safely.',
      'Results-oriented site coordinator focused on programme delivery, client communication, and consistent application of health and safety controls.',
      'Dedicated construction professional seeking to bring disciplined site organisation, safety leadership, and quality-first working habits to live projects.'
    ]
  },
  trades: {
    bullets:[
      'Completed installation and repair work to specification, testing systems thoroughly before handover to the customer or site team.',
      'Diagnosed faults methodically, identifying root causes and explaining options clearly to supervisors or clients.',
      'Followed safe isolation, permit, and lock-out procedures on every job, protecting people and equipment.',
      'Maintained tools, van stock, and paperwork so jobs could be completed efficiently without return visits for missing parts.',
      'Worked cleanly on occupied sites, protecting finishes and leaving areas tidy for the next trade or the end user.',
      'Read drawings and specifications accurately, measuring and marking out before cutting or fixing to avoid costly mistakes.',
      'Supported apprentices and less experienced colleagues with practical guidance on technique and site standards.',
      'Communicated progress and issues promptly so programmes could be adjusted and client expectations managed.'
    ],
    skills:['Fault Diagnosis','Installation','Health & Safety','Safe Isolation','Technical Drawings','Customer Service','Problem Solving','Tool Maintenance','Quality Workmanship','Time Management'],
    summaries:[
      'Skilled trades professional with experience delivering installation and repair work to a high standard while prioritising safety, cleanliness, and clear customer communication.',
      'Practical trade operative experienced in fault diagnosis, safe isolation, and completing jobs right first time with minimal disruption to occupied sites.',
      'Reliable tradesperson trusted to read drawings, maintain tools and stock, and leave work areas tidy for clients and following trades.',
      'Detail-oriented trade professional who combines technical accuracy with calm problem-solving when systems do not perform as expected.',
      'Hands-on trades worker with a strong safety record, disciplined paperwork habits, and the ability to explain technical options in plain language.',
      'Experienced trade operative comfortable working alone or as part of a multi-trade team, adapting to programme changes without losing quality.',
      'Quality-focused trades professional seeking roles where craftsmanship, safety compliance, and dependable communication are valued equally.',
      'Motivated tradesperson with proven installation and maintenance skills, ready to take ownership of jobs from first visit through to successful handover.'
    ]
  },
  driving: {
    bullets:[
      'Completed multi-drop delivery routes on time, planning the day to balance customer windows with traffic and loading constraints.',
      'Carried out daily vehicle checks, reporting defects immediately and keeping the cab and load area clean and presentable.',
      'Loaded and secured goods safely, protecting stock from damage and complying with weight and restraint requirements.',
      'Provided polite, professional service at each drop, collecting signatures and handling queries or refused deliveries correctly.',
      'Used handheld devices or paper manifests to record deliveries accurately and update the office without delay.',
      'Followed drivers’ hours, tachograph, and company policy rules to stay legal and rested throughout the week.',
      'Navigated unfamiliar areas confidently using maps or sat-nav while remaining calm under tight time pressure.',
      'Supported warehouse colleagues during loading peaks and reported recurring delivery issues that affected service levels.'
    ],
    skills:['Multi-drop Delivery','Vehicle Checks','Customer Service','Route Planning','Load Security','Health & Safety','Time Management','Navigation','Documentation','Manual Handling'],
    summaries:[
      'Reliable delivery driver with experience managing multi-drop routes, vehicle checks, and professional customer service while meeting tight time windows.',
      'Safety-conscious driver skilled at securing loads, completing daily defect checks, and keeping accurate delivery records for the office team.',
      'Customer-focused driving professional trusted to represent the company at every drop, handle queries calmly, and protect goods from damage in transit.',
      'Organised delivery driver experienced in planning efficient routes, complying with drivers’ hours rules, and adapting when traffic or customer access changes.',
      'Dependable transport team member who combines careful vehicle care with punctual service and clear communication when issues arise on the road.',
      'Practical driver with a strong record of on-time deliveries, accurate paperwork, and positive feedback from customers and dispatch teams.',
      'Professional driver comfortable with handheld devices, multi-site collections, and maintaining high standards of cab presentation and load safety.',
      'Motivated driving professional seeking to bring punctual route performance, safety discipline, and reliable customer contact to a busy logistics operation.'
    ]
  },
  office: {
    bullets:[
      'Coordinated day-to-day administration, keeping records, correspondence, and actions accurate and up to date for the wider team.',
      'Responded to enquiries professionally by phone and email, routing requests to the right colleague or department without delay.',
      'Prepared documents, reports, meeting packs, and data updates to support efficient team delivery and management decisions.',
      'Improved filing and tracking routines so information could be found quickly and deadlines remained visible to everyone involved.',
      'Managed diaries, meeting rooms, and travel arrangements, resolving clashes early and confirming details with attendees.',
      'Maintained confidential records carefully, following data protection expectations and internal access controls.',
      'Supported onboarding of new starters with equipment, system access, and induction paperwork so they could settle in quickly.',
      'Tracked invoices, purchase orders, or basic budgets, chasing outstanding items and flagging discrepancies to finance.'
    ],
    skills:['Administration','Microsoft Office','Data Entry','Calendar Management','Customer Service','Document Control','Written Communication','Organisation','Confidentiality','Problem Solving'],
    summaries:[
      'Organised administrative professional with a careful eye for detail, strong communication skills, and a proven ability to keep busy teams running smoothly day to day.',
      'Professional office coordinator trusted to manage information accurately, respond helpfully to enquiries, and follow actions through to completion without prompting.',
      'Reliable administrator experienced in diary management, document preparation, and confidential record-keeping across fast-moving office environments.',
      'Efficient office support professional skilled at improving filing systems, tracking deadlines, and giving managers clear status updates when priorities change.',
      'Service-minded administrator who combines polished written communication with practical problem-solving for colleagues, clients, and suppliers.',
      'Detail-focused office professional comfortable handling multi-channel enquiries, preparing accurate reports, and protecting sensitive information.',
      'Proactive administrative assistant with experience supporting onboarding, meeting logistics, and basic finance tracking for small and medium-sized teams.',
      'Motivated office professional seeking to bring disciplined organisation, calm communication, and dependable follow-through to a progressive workplace.'
    ]
  },
  finance: {
    bullets:[
      'Processed invoices, payments, and reconciliations accurately within agreed month-end and weekly deadlines.',
      'Investigated discrepancies between statements, purchase orders, and invoices, resolving queries with suppliers and internal teams.',
      'Maintained clear audit trails and filing so transactions could be reviewed quickly during internal or external checks.',
      'Supported month-end close by preparing schedules, accruals, and management information for senior finance staff.',
      'Handled confidential financial data carefully and followed segregation-of-duties controls at every step.',
      'Responded to internal stakeholder queries on budgets, coding, and payment status with clear, timely answers.',
      'Improved spreadsheet trackers and process notes, reducing repeated errors and speeding up routine finance tasks.',
      'Assisted with expense claims and credit control activity, chasing outstanding balances professionally and persistently.'
    ],
    skills:['Invoice Processing','Reconciliation','Microsoft Excel','Attention to Detail','Month-End Support','Data Accuracy','Confidentiality','Problem Solving','Credit Control','Financial Administration'],
    summaries:[
      'Accurate finance administrator with experience processing invoices, reconciliations, and month-end support while protecting confidential financial information.',
      'Detail-oriented accounts assistant skilled at investigating payment discrepancies and maintaining clear audit trails for internal and external review.',
      'Reliable finance team member trusted to meet weekly and month-end deadlines, support credit control, and answer stakeholder queries clearly.',
      'Organised financial administrator who combines strong Excel skills with disciplined process adherence and continuous improvement of routine trackers.',
      'Professional finance support worker experienced in expense claims, supplier queries, and accurate coding that keeps ledgers clean.',
      'Careful accounts professional with a proven ability to reduce errors through better documentation and proactive follow-up on outstanding items.',
      'Finance administrator comfortable working under deadline pressure while remaining precise, confidential, and collaborative with the wider business.',
      'Motivated finance professional seeking to apply reconciliation accuracy, process discipline, and clear stakeholder communication in a growing accounts team.'
    ]
  },
  healthcare: {
    bullets:[
      'Supported patients and service users with dignity and respect, following care plans and escalating concerns promptly.',
      'Maintained accurate clinical or care records so colleagues had reliable information at every handover.',
      'Followed infection prevention, safeguarding, and health and safety procedures consistently during every shift.',
      'Communicated clearly with nurses, therapists, and families to coordinate appointments and daily care needs.',
      'Assisted with personal care, mobility, or clinical support tasks within the scope of training and local policy.',
      'Monitored changes in condition and reported observations without delay so clinical decisions could be made early.',
      'Kept treatment areas and equipment clean, stocked, and ready for safe use throughout the day.',
      'Contributed to a calm, reassuring environment for patients while managing competing priorities on a busy ward or service.'
    ],
    skills:['Patient Care','Infection Prevention','Record Keeping','Safeguarding','Communication','Teamwork','Health & Safety','Empathy','Confidentiality','Time Management'],
    summaries:[
      'Compassionate healthcare support professional experienced in patient-centred care, accurate record-keeping, and strict adherence to infection prevention and safeguarding standards.',
      'Reliable care team member skilled at clear handover communication, monitoring changes in condition, and escalating concerns without delay.',
      'Professional healthcare worker trusted to support personal care and clinical routines within training limits while protecting dignity and confidentiality.',
      'Calm healthcare assistant with experience working on busy wards or community services, coordinating with multi-disciplinary teams and families.',
      'Detail-focused healthcare professional who combines empathy with disciplined documentation and consistent application of health and safety procedures.',
      'Supportive care worker experienced in maintaining clean, well-stocked clinical areas and contributing to a reassuring environment for patients.',
      'Healthcare team member with a proven ability to manage competing priorities while remaining attentive to individual care plans and risk assessments.',
      'Motivated healthcare professional seeking to bring compassionate practice, reliable communication, and strong safeguarding awareness to a high-quality care setting.'
    ]
  },
  education: {
    bullets:[
      'Supported teaching staff with classroom preparation, resources, and small-group activities that helped pupils stay engaged.',
      'Worked with individual learners on agreed targets, adapting explanations and encouragement to different ability levels.',
      'Maintained a safe, inclusive classroom environment, following behaviour policies and safeguarding procedures at all times.',
      'Recorded observations and progress notes so teachers had clear evidence for planning and parent discussions.',
      'Assisted with displays, equipment set-up, and routine administration that kept lessons running smoothly.',
      'Supervised pupils during breaks, transitions, and off-site activities, remaining alert to wellbeing and behaviour risks.',
      'Communicated constructively with parents and carers within agreed boundaries, escalating sensitive issues to teachers.',
      'Supported pupils with additional needs using strategies agreed in education plans and specialist guidance.'
    ],
    skills:['Classroom Support','Safeguarding','Communication','Behaviour Management','Record Keeping','Patience','Teamwork','Inclusion','Organisation','Child Development Awareness'],
    summaries:[
      'Supportive education professional with experience helping teachers deliver engaging lessons and working patiently with learners of different abilities.',
      'Reliable classroom assistant skilled at safeguarding, behaviour support, and clear progress notes that help teachers plan next steps.',
      'Education team member trusted to supervise pupils safely during transitions and activities while promoting an inclusive classroom culture.',
      'Practical learning support professional experienced in adapting explanations for individual needs and following agreed education plans carefully.',
      'Organised education assistant who combines resource preparation with calm communication toward pupils, teachers, and parents within policy boundaries.',
      'Patient education worker with a strong understanding of classroom routines, behaviour expectations, and the importance of accurate observation records.',
      'Dedicated school support professional seeking to contribute stable classroom support, safeguarding vigilance, and positive relationships with learners.',
      'Motivated education assistant ready to bring inclusive practice, careful documentation, and collaborative teamwork to a progressive school environment.'
    ]
  },
  security: {
    bullets:[
      'Patrolled assigned areas systematically, remaining alert to access control, safety hazards, and unusual activity.',
      'Controlled entry and exit points, checking credentials and logging visitors accurately in line with site procedures.',
      'Responded to alarms and incidents calmly, securing the scene and escalating to supervisors or emergency services when required.',
      'Completed detailed incident and daily occurrence reports so managers had a clear record of events and actions taken.',
      'Monitored CCTV systems, reviewing footage when needed and reporting issues with cameras or recording equipment.',
      'Provided a professional, approachable presence for staff and visitors while enforcing site rules consistently.',
      'Supported evacuation drills and emergency procedures, guiding people to safety and accounting for occupants where required.',
      'Maintained radio discipline and clear communication with control rooms and colleagues throughout each shift.'
    ],
    skills:['Patrolling','Access Control','CCTV Monitoring','Incident Reporting','Conflict Management','Customer Service','Radio Communication','Health & Safety','Observation','Emergency Response'],
    summaries:[
      'Vigilant security professional with experience in patrolling, access control, and incident reporting while maintaining a calm, professional presence on site.',
      'Reliable security officer skilled at CCTV monitoring, visitor management, and escalating alarms or incidents according to clear procedures.',
      'Safety-focused security team member trusted to enforce site rules fairly, complete accurate reports, and support emergency drills without drama.',
      'Observant security professional experienced in conflict management, radio communication, and protecting people and property across commercial sites.',
      'Disciplined security officer who combines thorough patrol routines with approachable customer service for staff and legitimate visitors.',
      'Security team member with a proven ability to respond under pressure, secure scenes, and keep control rooms informed with concise updates.',
      'Professional security operative seeking roles where integrity, situational awareness, and reliable documentation are essential to site safety.',
      'Motivated security officer ready to apply access control discipline, CCTV vigilance, and clear incident reporting in a regulated environment.'
    ]
  },
  cleaning: {
    bullets:[
      'Completed scheduled cleaning routines across assigned areas to a consistent standard, prioritising high-traffic and high-risk zones.',
      'Followed COSHH guidance for chemicals, diluting and storing products correctly and using the right PPE for each task.',
      'Reported maintenance issues, hazards, and stock shortages promptly so problems did not affect service quality or safety.',
      'Worked efficiently in occupied buildings, remaining discreet, polite, and flexible around staff or customer activity.',
      'Maintained cleaning equipment carefully, performing basic checks and escalating faults before they stopped the schedule.',
      'Supported deep cleans, special events, and infection-prevention tasks when additional standards were required.',
      'Kept cupboards, trolleys, and service rooms organised so the next shift could start without delay.',
      'Followed colour-coding and infection-control procedures to prevent cross-contamination between areas.'
    ],
    skills:['Commercial Cleaning','COSHH','Infection Prevention','Health & Safety','Attention to Detail','Time Management','Floor Care','Customer Service','Equipment Care','Teamwork'],
    summaries:[
      'Reliable cleaning professional with experience delivering high standards across commercial sites while following COSHH and infection-prevention procedures carefully.',
      'Detail-focused cleaner trusted to work efficiently in occupied buildings, remain discreet around staff, and prioritise high-risk areas without cutting corners.',
      'Practical cleaning operative skilled at equipment care, colour-coded processes, and reporting hazards or stock gaps before they affect service.',
      'Professional cleaner with a strong record of meeting scheduled routines, supporting deep cleans, and maintaining organised service rooms for the next shift.',
      'Safety-conscious cleaning team member experienced in correct chemical use, PPE, and infection-control methods across healthcare or commercial environments.',
      'Hard-working cleaner who combines consistent presentation standards with polite customer awareness and flexible response to urgent tasks.',
      'Organised cleaning professional seeking to bring disciplined routines, COSHH compliance, and dependable attendance to a quality-focused facilities team.',
      'Motivated cleaning operative ready to take ownership of assigned areas, protect equipment, and uphold hygiene standards that clients notice and trust.'
    ]
  },
  technology: {
    bullets:[
      'Diagnosed and resolved hardware, software, and connectivity issues for end users, documenting fixes for future reference.',
      'Installed and configured devices and applications according to company standards, ensuring security settings were applied correctly.',
      'Logged tickets accurately, prioritised work by impact, and kept users informed until issues were fully closed.',
      'Supported onboarding and offboarding by preparing accounts, equipment, and access in line with IT and security policy.',
      'Monitored basic system health and escalated recurring incidents to senior engineers with clear evidence and steps already tried.',
      'Created simple user guides and explained technical steps in plain language so colleagues could work independently next time.',
      'Maintained asset records and warranty information so hardware lifecycle decisions were based on accurate data.',
      'Participated in projects such as office moves, upgrades, or rollouts, coordinating logistics and minimising downtime.'
    ],
    skills:['Troubleshooting','IT Support','Ticketing Systems','Windows','Networking Basics','Customer Service','Documentation','Active Directory Awareness','Hardware Setup','Problem Solving'],
    summaries:[
      'Practical IT support professional with experience resolving hardware and software issues, managing tickets, and explaining technical steps in clear language for non-technical users.',
      'Reliable technology team member skilled at device setup, account provisioning, and keeping accurate asset and ticket records from first contact to resolution.',
      'User-focused IT specialist trusted to prioritise high-impact incidents, escalate complex faults with good evidence, and protect security settings during installs.',
      'Organised technology support worker experienced in onboarding equipment, documenting fixes, and reducing repeat tickets through better user guidance.',
      'Calm IT professional who combines methodical troubleshooting with patient communication when systems fail at critical moments for the business.',
      'Hands-on technology operative comfortable supporting office moves, upgrades, and rollouts while minimising disruption for colleagues.',
      'Detail-oriented IT support professional seeking to bring disciplined ticket handling, security awareness, and continuous learning to a modern support desk.',
      'Motivated technology specialist ready to own end-user issues end-to-end and help teams stay productive with stable, well-documented systems.'
    ]
  },
  creative: {
    bullets:[
      'Produced design or content assets to brief, balancing creativity with brand guidelines, deadlines, and stakeholder feedback.',
      'Managed multiple creative requests at once, prioritising work clearly and communicating realistic timelines to the team.',
      'Prepared files for print or digital use, checking formats, resolutions, and version control before handover.',
      'Collaborated with marketing, product, or client teams to refine concepts and incorporate feedback without losing the core idea.',
      'Maintained organised project folders and naming conventions so assets could be found and reused efficiently.',
      'Researched trends, references, and competitor work to strengthen creative proposals and keep outputs current.',
      'Supported campaign launches by producing variations, templates, and last-minute amendments under tight time pressure.',
      'Presented work clearly, explaining design decisions and recommended next steps to non-design stakeholders.'
    ],
    skills:['Adobe Creative Suite','Typography','Brand Guidelines','Attention to Detail','Time Management','Collaboration','Version Control','Presentation Skills','Creative Thinking','Project Organisation'],
    summaries:[
      'Creative professional with experience turning briefs into polished visual or content work while managing feedback, brand rules, and deadlines confidently.',
      'Organised designer or content specialist skilled at multi-request prioritisation, clean file preparation, and clear collaboration with marketing and client teams.',
      'Detail-focused creative practitioner trusted to prepare print-ready and digital assets, maintain version control, and protect brand consistency across outputs.',
      'Practical creative team member who combines strong visual judgement with realistic scheduling and calm handling of last-minute campaign changes.',
      'Collaborative creative professional experienced in presenting ideas clearly to non-design stakeholders and refining concepts without losing impact.',
      'Reliable creative producer with a proven ability to research references, organise project files, and deliver consistent quality under commercial time pressure.',
      'Versatile creative specialist seeking roles where craft, organisation, and constructive feedback loops are valued equally in campaign delivery.',
      'Motivated creative professional ready to own assets from brief to final handover and help teams launch work that is both distinctive and on-brand.'
    ]
  }
};

const JOB_TITLE_GROUPS = {
  retail:['Store Manager','Assistant Store Manager','Retail Supervisor','Sales Assistant','Cashier','Retail Merchandiser','Department Manager','Shop Assistant','Visual Merchandiser','Shelf Stacker','Checkout Supervisor','Retail Assistant','Storekeeper'],
  hospitality:['Waiter / Waitress','Restaurant Manager','Barista','Bartender','Chef','Cook','Kitchen Assistant','Catering Assistant','Hotel Receptionist','Housekeeper','Front of House Supervisor','Sous Chef','Pastry Chef','Food and Beverage Manager','Events Coordinator','Dishwasher','Food Service Assistant','Hotel Porter','Laundry Assistant'],
  warehouse:['Warehouse Worker','Warehouse Operative','Picker Packer','Forklift Operator','Goods-In Operative','Dispatch Clerk','Inventory Controller','Logistics Coordinator','Distribution Supervisor','Stockroom Assistant','Transport Planner','Fleet Coordinator','Supply Chain Assistant','Warehouse Team Leader','Loader','Unloader','Parcel Sorter','Order Fulfilment Assistant'],
  manufacturing:['Factory Worker','Production Operative','Assembly Operative','Machine Operator','CNC Operator','Production Technician','Quality Inspector','Process Operator','Packaging Operative','Line Leader','Maintenance Operative','Manufacturing Supervisor','Toolmaker','Press Operator','Injection Moulding Operator','Production Planner','Continuous Improvement Coordinator','Factory Packer','Machine Setter','Food Production Operative'],
  construction:['Construction Worker','General Labourer','Site Labourer','Groundworker','Bricklayer','Carpenter','Painter and Decorator','Scaffolder','Site Supervisor','Quantity Surveyor','Contracts Manager','Plasterer','Roofer','Tiler','Steel Fixer','Demolition Operative','Site Manager','Paving Operative','Drainage Operative','Traffic Marshal','Asbestos Removal Operative'],
  trades:['Electrician','Plumber','Heating Engineer','Gas Engineer','Welder','Fabricator','Automotive Technician','Mechanic','Vehicle Technician','Maintenance Engineer','Refrigeration Engineer','Electrical Engineer','Mechanical Engineer','Building Services Engineer','Engineering Technician','Tyre Fitter','Glazier','Locksmith','Gardener','Landscaper','Pest Control Technician'],
  driving:['Delivery Driver','HGV Driver','LGV Driver','Van Driver','Courier','Bus Driver','Taxi Driver','Forklift Driver','Driver / Warehouse Operative','Class 1 Driver','Class 2 Driver','Coach Driver','LGV Technician','Street Sweeper Driver','Refuse Collector'],
  office:['Administrative Assistant','Office Administrator','Receptionist','Secretary','Personal Assistant','Executive Assistant','Data Entry Clerk','Office Manager','Project Coordinator','Recruitment Assistant','Customer Service Representative','Call Centre Advisor','Sales Administrator','Operations Administrator','Legal Secretary','Medical Secretary','Facilities Coordinator','Service Desk Coordinator','Clerical Assistant','Front Desk Assistant','Mailroom Clerk','Records Assistant'],
  finance:['Accountant','Accounts Assistant','Bookkeeper','Payroll Administrator','Finance Assistant','Credit Controller','Purchase Ledger Clerk','Management Accountant','Financial Analyst','Audit Assistant','Finance Manager','Tax Assistant','Commercial Analyst','Accounts Payable Assistant','Accounts Receivable Assistant'],
  healthcare:['Registered Nurse','Healthcare Assistant','Caregiver','Support Worker','Nursing Assistant','Senior Care Assistant','Care Coordinator','Dental Nurse','Pharmacy Assistant','Physiotherapist','Occupational Therapist','Mental Health Support Worker','Midwife','Paramedic','Radiographer','Healthcare Administrator','Clinical Support Worker'],
  education:['Teacher','Teaching Assistant','Cover Supervisor','Nursery Practitioner','Early Years Educator','Tutor','Lecturer','Learning Support Assistant','School Administrator','Head Teacher','SEN Teaching Assistant','Training Coordinator','Education Officer'],
  security:['Security Guard','Security Officer','CCTV Operator','Door Supervisor','Security Supervisor','Loss Prevention Officer','Events Security Officer','Security Manager','Retail Security Officer','Mobile Patrol Officer'],
  cleaning:['Cleaner','Commercial Cleaner','Industrial Cleaner','Window Cleaner','Janitor'],
  technology:['Software Developer','Web Developer','Frontend Developer','Backend Developer','Full Stack Developer','IT Support Technician','Systems Administrator','Network Engineer','Data Analyst','QA Tester','DevOps Engineer','Cyber Security Analyst','Business Analyst','Product Manager','Solutions Architect','Database Administrator','Cloud Engineer','Technical Project Manager','Helpdesk Analyst'],
  creative:['Graphic Designer','UX Designer','Content Writer','Copywriter','Marketing Assistant','Social Media Manager','Digital Marketing Executive','Photographer','Video Editor','Marketing Manager','Brand Manager','Communications Officer','PR Assistant','SEO Specialist','Content Producer']
};

const ROLE_SUGGESTION_EXTRAS = {
  retail:{bullets:['Used customer feedback and daily observations to improve availability, presentation, and service routines.','Completed opening and closing checks, cashing-up, compliance tasks, and handovers accurately.','Handled customer questions, exchanges, and complaints with a calm and solutions-focused approach.','Supported stock counts, deliveries, promotions, and seasonal changes while keeping the shop floor organised.'],skills:['Merchandising','Loss Prevention','Cash Reconciliation','Customer Complaints']},
  hospitality:{bullets:['Maintained a clean, well-prepared service area and reset stations quickly between customers or sittings.','Recorded orders and payments accurately while coordinating timing with kitchen, bar, and front-of-house colleagues.','Checked deliveries, rotated ingredients, and flagged shortages or quality concerns before service.','Contributed to positive reviews and repeat business through friendly, attentive, and reliable service.'],skills:['Allergen Awareness','Table Service','Food Preparation','Till Systems']},
  warehouse:{bullets:['Loaded and unloaded goods safely, checking quantities and condition against delivery or dispatch paperwork.','Used space efficiently when storing stock and followed rotation, labelling, and location-control procedures.','Worked to shift targets without compromising scan accuracy, product care, or safe manual-handling technique.','Supported housekeeping, audits, and team handovers to keep the operation ready for the next shift.'],skills:['Goods Handling','Stock Rotation','Loading and Unloading','Order Accuracy']},
  manufacturing:{bullets:['Set up materials and workstations for production runs, checking specifications before starting each batch.','Identified defects, segregated non-conforming products, and raised quality concerns through the correct process.','Completed cleaning, line clearance, and changeover tasks to maintain safe and efficient production flow.','Contributed practical improvement ideas that reduced waste, rework, interruptions, or unnecessary movement.'],skills:['Line Clearance','Changeovers','Root Cause Analysis','Waste Reduction']},
  construction:{bullets:['Measured, moved, and prepared materials carefully, keeping tools and work areas ready for the next task.','Followed toolbox talks, permit requirements, safe systems of work, and instructions from site leadership.','Checked finished work against drawings, tolerances, and quality expectations before handing it over.','Adapted to changing site priorities while maintaining punctuality, teamwork, and a dependable work rate.'],skills:['Toolbox Talks','Site Logistics','Material Preparation','Quality Inspection']},
  trades:{bullets:['Planned each job, confirmed the required parts, and kept customers or supervisors informed about progress.','Carried out testing and commissioning checks before leaving work safe, functional, and ready for use.','Maintained clear service notes, certificates, quotations, and parts records for completed work.','Diagnosed recurring faults and recommended preventive actions to improve reliability and reduce repeat visits.'],skills:['Testing and Commissioning','Preventive Maintenance','Technical Documentation','Parts Identification']},
  driving:{bullets:['Planned journeys around traffic, delivery windows, vehicle restrictions, and customer requirements.','Completed delivery paperwork and digital proof-of-delivery records accurately at each stop.','Managed delays, failed deliveries, or customer concerns professionally and escalated issues promptly.','Kept the vehicle clean, secure, and roadworthy while following transport and working-time procedures.'],skills:['Digital Proof of Delivery','Vehicle Maintenance','Journey Management','Driving Regulations']},
  office:{bullets:['Maintained confidential records and handled sensitive information in line with organisational procedures.','Tracked deadlines, actions, and incoming requests so colleagues received timely and accurate updates.','Created repeatable templates and checklists that improved consistency across routine administrative work.','Welcomed visitors and callers professionally while balancing interruptions with planned priorities.'],skills:['Confidentiality','Records Management','Workflow Coordination','Customer Relationship Management']},
  finance:{bullets:['Matched transactions to source documents and followed up outstanding items with relevant stakeholders.','Applied agreed approval controls and maintained a clear audit trail for each financial activity.','Used spreadsheets or finance systems to investigate variances and present concise findings.','Met reporting deadlines while protecting accuracy, confidentiality, and consistency across the ledger.'],skills:['Variance Analysis','Expense Processing','Audit Support','Finance Systems']},
  healthcare:{bullets:['Supported daily routines in a respectful way, encouraging independence and responding to individual preferences.','Maintained clear handovers so colleagues understood risks, appointments, changes, and follow-up actions.','Used equipment correctly and kept care areas safe, clean, and prepared for the people using them.','Stayed calm during challenging situations and sought appropriate support when needs changed.'],skills:['Care Planning','Medication Awareness','Handover Communication','Dignity and Respect']},
  education:{bullets:['Prepared resources and learning spaces so activities could begin promptly and run safely.','Monitored participation and progress, keeping clear notes to inform planning and support decisions.','Encouraged positive relationships, confidence, and independence through consistent, respectful guidance.','Used digital tools and practical activities to make learning accessible and engaging.'],skills:['Behaviour Support','Progress Tracking','Resource Preparation','Inclusive Practice']},
  security:{bullets:['Verified identification and followed visitor, contractor, key-control, and site-access procedures.','Maintained accurate control-room or duty logs and communicated relevant information during handovers.','Used de-escalation and professional communication to manage concerns before they became incidents.','Protected evidence and followed reporting, escalation, and confidentiality requirements after an event.'],skills:['Key Control','Visitor Management','Radio Communications','De-escalation']},
  cleaning:{bullets:['Planned tasks around room use, access arrangements, priority areas, and agreed service-level requirements.','Used colour-coded equipment and correct dilution procedures to reduce cross-contamination and product waste.','Completed periodic deep-cleaning work including floors, washrooms, high-touch surfaces, or specialist areas.','Worked consistently to inspection standards and responded quickly to feedback or changing priorities.'],skills:['Colour-Coded Cleaning','Infection Prevention','Washroom Services','Floor Care']},
  technology:{bullets:['Translated user needs into clear tasks, documented decisions, and delivered work in manageable stages.','Tested changes against expected outcomes and resolved defects before release or handover.','Created clear technical notes and user guidance so others could support the solution confidently.','Monitored performance and used feedback, incidents, or metrics to prioritise further improvements.'],skills:['Agile Delivery','Release Management','User Support','Data Analysis']},
  creative:{bullets:['Developed concepts from research and brief requirements, presenting clear options and rationale to stakeholders.','Prepared final assets to the correct technical specifications, formats, and publishing requirements.','Maintained an organised asset library and tracked approvals so work could be reused efficiently.','Balanced originality with accessibility, deadlines, feedback, and measurable communication goals.'],skills:['Campaign Development','Editorial Planning','Asset Management','Audience Research']}
};

const UNIVERSAL_RESPONSIBILITY_EXTRAS = [
  'Maintained accurate records and communicated important updates clearly to colleagues, supervisors, or customers.',
  'Prioritised competing tasks effectively while meeting agreed deadlines and maintaining consistent quality standards.',
  'Worked cooperatively with others, contributing to a respectful, dependable, and productive team environment.',
  'Followed workplace policies, safety requirements, and quality procedures while identifying opportunities to improve daily work.'
];

/* Original 15-group role profiles and 200+ job-title names above are preserved.
 * Additional examples are additive: this is not AI output and no claims are verified.
 * Only selections explicitly made by a user can enter a CV.
 */
const LABELS = Object.freeze({
 retail:'Retail',hospitality:'Hospitality',warehouse:'Warehouse and logistics',
 manufacturing:'Manufacturing',construction:'Construction',trades:'Trades and maintenance',
 driving:'Driving and delivery',office:'Office and administration',finance:'Finance',
 healthcare:'Healthcare and care',education:'Education',security:'Security',
 cleaning:'Cleaning',technology:'Technology',creative:'Creative and marketing'
});
const NOUNS = Object.freeze({
 retail:'retail professional',hospitality:'hospitality team member',warehouse:'warehouse professional',
 manufacturing:'production operative',construction:'construction team member',
 trades:'maintenance and trades professional',driving:'delivery and transport professional',
 office:'administrative professional',finance:'finance professional',
 healthcare:'care and healthcare professional',education:'education professional',
 security:'security professional',cleaning:'cleaning professional',
 technology:'technology professional',creative:'creative professional'
});
const CLEANING_ROLES = Object.freeze([
 'Domestic Cleaner','Office Cleaner','Hotel Cleaner','Hospital Cleaner',
 'Housekeeper','Cleaning Operative','Facilities Cleaner','Cleaning Supervisor'
]);
const CLEANING_SUMMARY_EXTRAS = Object.freeze([
 'Conscientious cleaning professional focused on safe, consistent standards across offices, washrooms and shared spaces. Takes care to select suitable supplies and follow site instructions.',
 'Organised cleaner who approaches daily schedules methodically, checks high-touch areas and keeps equipment ready for the next task. Values punctuality and respectful service.',
 'Safety-minded cleaning operative attentive to chemical labels, personal protective equipment and secure storage. Keen to maintain a tidy, hygienic environment without cutting corners.',
 'Practical cleaner with an interest in commercial facilities and effective cleaning routines. Pays attention to detail while communicating maintenance concerns promptly.',
 'Service-oriented housekeeping professional focused on welcoming, well-presented rooms and reliable preparation for new occupants. Works carefully around visitors and personal belongings.',
 'Dependable office cleaner committed to keeping workspaces orderly, washrooms stocked and shared facilities presentable. Adapts routines around occupied areas with discretion.',
 'Careful industrial cleaning operative who values safe equipment checks, controlled work areas and clear handovers. Seeks to support consistent site hygiene and housekeeping.',
 'Detail-oriented hospital cleaning candidate who understands the importance of following site-specific infection-prevention instructions. Prioritises hygiene, respectful conduct and timely reporting.',
 'Flexible cleaner prepared to handle planned routines, occasional deep cleans and changing site priorities. Keeps safety, access arrangements and quality checks in view.',
 'Professional cleaning team member with a calm, cooperative approach to shift work. Communicates supply shortages and issues early to avoid disruption.',
 'Reliable domestic cleaner who takes pride in clean kitchens, bathrooms and living areas. Aims to follow individual household preferences and treat property with care.',
 'Facilities cleaning professional interested in combining effective routine work with sensible waste handling and supply control. Keeps shared spaces ready for daily use.',
 'Quality-focused cleaning operative who checks completed areas against agreed expectations and follows up on feedback. Works carefully with appropriate tools and methods.',
 'Proactive cleaner with a structured approach to floor care, waste collection and general presentation. Values safe lifting, correct equipment use and dependable attendance.',
 'Customer-aware cleaner comfortable working near staff, residents or guests. Maintains polite communication and respects privacy while completing assigned cleaning tasks.',
 'Motivated cleaning candidate seeking to contribute through reliable routines, attention to hygiene and willingness to learn site procedures. Ready to take feedback and improve steadily.',
 'Cleaning professional who brings an orderly approach to shift preparation, stock checks and service-room housekeeping. Focuses on safe, efficient work and clear team handovers.'
]);
const CLEANING_EXTRA_SKILLS = Object.freeze([
 'Domestic Cleaning','Office Cleaning','Hospitality Housekeeping','Waste Segregation',
 'Safe Chemical Handling','PPE Selection','Deep Cleaning','Surface Sanitization',
 'High-Touch Surface Care','Spill Response','Supply Inventory','Cleaning Equipment Checks'
]);
const CLEANING_EXTRA_DUTIES = Object.freeze([
 'Cleaned and checked kitchens, washrooms and shared areas against the agreed site checklist.',
 'Prepared and replenished consumables such as soap, paper products and cleaning supplies.',
 'Separated and disposed of waste according to the local site procedure.',
 'Inspected cleaning equipment before use and reported faults or damage.',
 'Responded to spills or urgent cleaning needs using the appropriate safety precautions.',
 'Kept cleaning cupboards, tools and carts labelled, orderly and secure.',
 'Completed room or area handovers, noting unfinished tasks and supply shortages.',
 'Checked high-touch points such as handles, switches and railings during routine cleaning.'
]);
const normal = value => String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const dedupe = values => [...new Map(values.filter(v=>typeof v==='string'&&v.trim())
 .map(v=>[normal(v),v.trim()])).values()];
const ROLES = Object.freeze(Object.fromEntries(Object.keys(LABELS).map(id=>[
 id,Object.freeze(dedupe([...(JOB_TITLE_GROUPS[id]||[]),...(id==='cleaning'?CLEANING_ROLES:[])]))
])));
const BY_TITLE = new Map(Object.entries(ROLES).flatMap(([group,titles]) =>
 titles.map(title=>[normal(title),{group,title}])));
const GROUP_NAMES = Object.freeze(Object.keys(LABELS));
export const OCCUPATION_CATEGORIES = Object.freeze(GROUP_NAMES.map(id=>
 Object.freeze({id,label:LABELS[id],roles:ROLES[id]})));
export function categoryRoles(category){
 return ROLES[category]||[];
}
export function resolveOccupation(query){
 const q=normal(query);
 if(!q)return null;
 const exact=BY_TITLE.get(q);
 if(exact)return {...exact};
 const group=GROUP_NAMES.find(id=>q===id||q===normal(LABELS[id]));
 if(group)return {group,title:ROLES[group][0]};
 const aliases={clean:'cleaning',cleaning:'cleaning',janitorial:'cleaning',housekeeping:'cleaning',
  housekeepingservices:'cleaning',security:'security',cctv:'security',accounting:'finance',
  administration:'office',it:'technology',tech:'technology',transport:'driving'};
 if(aliases[q.replace(/\s/g,'')]){const id=aliases[q.replace(/\s/g,'')];return {group:id,title:ROLES[id][0]};}
 const contained=[...BY_TITLE.entries()].filter(([key])=>key.length>=7&&
  (q.startsWith(key+' ')||q.endsWith(' '+key)||q.includes(' '+key+' ')));
 if(contained.length){contained.sort((a,b)=>b[0].length-a[0].length);return {...contained[0][1]};}
 if(/\b(cleaner|cleaning|janitor|housekeep)\b/.test(q))return {group:'cleaning',title:'Cleaner'};
 return null; // Unknown occupations do not silently receive office content.
}
const INTERPOLATED_STYLES = Object.freeze([
 (n,s)=>'Organised '+n+' focused on '+s[0]+' and '+s[1]+'. Brings a thoughtful approach to routine work, communication and consistent standards.',
 (n,s)=>'Dependable '+n+' who values '+s[2]+', '+s[3]+' and clear follow-through. Seeks to make a practical contribution to daily team goals.',
 (n,s)=>'Detail-focused '+n+' committed to careful task preparation and '+s[0]+'. Looks for opportunities to learn local procedures and build trust.',
 (n,s)=>'Motivated '+n+' interested in roles where '+s[1]+' and '+s[4]+' matter. Works toward safe, reliable service and straightforward communication.',
 (n,s)=>'Practical '+n+' with an organised approach to '+s[2]+'. Values accuracy, agreed deadlines and respectful teamwork.',
 (n,s)=>'Service-minded '+n+' who aims to combine '+s[3]+' with responsive support. Takes feedback seriously and prioritises quality.',
 (n,s)=>'Reliable '+n+' seeking to apply '+s[0]+' and '+s[4]+' in a supportive workplace. Committed to continuous improvement.',
 (n,s)=>'Methodical '+n+' comfortable following defined processes and checking work carefully. Particularly interested in '+s[1]+' and '+s[2]+'.',
 (n,s)=>'Adaptable '+n+' who approaches changing priorities with patience and focus. Keen to support colleagues through '+s[3]+' and good communication.',
 (n,s)=>'Quality-conscious '+n+' focused on dependable outcomes and safe working practices. Sees '+s[0]+' and '+s[2]+' as important parts of the role.',
 (n,s)=>'Collaborative '+n+' who values clarity, preparation and responsible follow-through. Looking to use '+s[1]+' and '+s[4]+' to support team goals.',
 (n,s)=>'Resourceful '+n+' seeking work where careful planning and '+s[3]+' help teams succeed. Willing to learn, take feedback and maintain standards.',
 (n,s)=>'Conscientious '+n+' interested in reliable daily operations and '+s[0]+'. Prioritises accuracy, professional conduct and timely handovers.',
 (n,s)=>'Steady '+n+' who takes a considered approach to competing tasks. Keen to combine '+s[4]+' with helpful communication and efficient routines.',
 (n,s)=>'Focused '+n+' aiming to deliver consistent service through '+s[2]+' and '+s[1]+'. Pays attention to instructions, safety and presentation.',
 (n,s)=>'Professional '+n+' who values problem solving and dependable collaboration. Interested in applying '+s[0]+' with discipline and care.',
 (n,s)=>'Motivated '+n+' who believes organised work and '+s[3]+' contribute to stronger results. Ready to tailor methods to each employer.'
]);
export function occupationContent({role='',category=''}={}){
 const selected=GROUP_NAMES.includes(category)?{group:category,title:role||ROLES[category][0]}:resolveOccupation(role);
 if(!selected)return null;
 const group=selected.group,original=ROLE_PROFILES[group],extra=ROLE_SUGGESTION_EXTRAS[group];
 const skillSet=dedupe([...original.skills,...extra.skills,...(group==='cleaning'?CLEANING_EXTRA_SKILLS:[])]);
 const dutySet=dedupe([...original.bullets,...extra.bullets,
  ...UNIVERSAL_RESPONSIBILITY_EXTRAS,...(group==='cleaning'?CLEANING_EXTRA_DUTIES:[])]);
 const s=original.skills;
 const normalizedSkills=Array.from({length:5},(_,i)=>s[i%s.length].toLowerCase());
 const supplementary=group==='cleaning'?CLEANING_SUMMARY_EXTRAS:
  INTERPOLATED_STYLES.map(fn=>fn(NOUNS[group],normalizedSkills));
 const summaries=dedupe([...original.summaries,...supplementary]);
 return {group,groupLabel:LABELS[group],role:role||selected.title,
  summaries,skills:skillSet,duties:dutySet,exampleOnly:true};
}
export function addUniqueSkill(existing,name){
 const text=String(name||'').trim();
 if(!text||existing.some(s=>normal(typeof s==='string'?s:s.name)===normal(text)))return null;
 return text;
}
export function appendUniqueDuty(existingText,bullet){
 const old=String(existingText||'').trim(),value=String(bullet||'').trim();
 if(!value||old.split(/\r?\n/).some(line=>normal(line.replace(/^[-•]\s*/,''))===normal(value)))return null;
 return old?(old+'\n'+value):value;
}
