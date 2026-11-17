export const SYNTH_DOC=()=>({personalInfo:{firstName:'Ada',lastName:'Example',title:'Operations Manager',email:'ada@example.test',phone:'+44 20 7946 0000',city:'Leeds',linkedin:'linkedin.com/in/ada-example',website:'ada.example.test'},
 summary:'Synthetic summary for testing only.',
 experience:[
  {id:'e1',title:'Operations Manager',employer:'Acme Retail',location:'Leeds',start:'Jan 2020',end:'',current:true,description:'<ul><li>Led a team of 12.</li><li>Cut waste by reviewing weekly stock counts.</li></ul>'},
  {id:'e2',title:'Supervisor',employer:'Bolt Stores',location:'',start:'2016',end:'2019',current:false,description:'<p>Opened and closed the store.</p>'}],
 education:[{id:'d1',degree:'BA Business',school:'Example University',start:'2012',end:'2015',description:''}],
 skills:[{name:'Scheduling',level:4},{name:'Stock control',level:3}],
 languages:[],certifications:[],projects:[],accomplishments:[],hobbies:'',references:'Available on request',customSections:[]});
export const LONG_DOC=(n=40)=>{const d=SYNTH_DOC();d.experience=Array.from({length:n},(_,i)=>({id:'x'+i,title:'Role '+i,employer:'Company '+i,location:'',start:String(2000+(i%20)),end:String(2001+(i%20)),current:false,
 description:'<ul>'+Array.from({length:4},(_,j)=>'<li>Delivered synthetic outcome '+j+' for review '+i+' with a deliberately long sentence to force wrapping across the printable width of the page.</li>').join('')+'</ul>'}));return d;};
export const TEXT_CV=`Grace Hopper
Senior Engineer
grace@example.test | +1 202 555 0143 | linkedin.com/in/grace-example

Summary
Builds reliable systems.

Experience
Senior Engineer at Navy Labs
Jan 2018 - Present
- Led compiler team.
- Cut build time.

Engineer, Univac
2012 - 2017
- Wrote tests.

Education
BSc Mathematics - Vassar College
2008 - 2012

Skills
COBOL, Testing; Mentoring
`;
