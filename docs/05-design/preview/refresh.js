/* Phase 3X visual refresh preview (ROADMAP 3X.3). Classic script so the page works from file:// (module scripts are
   blocked there). Both looks are rendered from the SAME templates: look 'old' = today, 'new' = visual-refresh.md.
   deriveCategoryColor below is a copy of docs/05-design/refresh/derive-category-color.mjs; verify-preview.mjs checks
   that both give identical results. */
(function () {
  'use strict';

  /* ---------- Icons: Phosphor Icons v2 (MIT), copied from preview/index.html ---------- */
  var ICONS = {"wallet":"<path d=\"M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z\"/>",
    "trend-up":"<path d=\"M240,56v64a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,212.69,64H168a8,8,0,0,1,0-16h64A8,8,0,0,1,240,56Z\"/>",
    "briefcase":"<path d=\"M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72Zm0,128H40V131.64A200.19,200.19,0,0,0,128,152a200.25,200.25,0,0,0,88-20.37V200ZM104,112a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,112Z\"/>",
    "caret-left":"<path d=\"M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z\"/>",
    "caret-right":"<path d=\"M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z\"/>",
    "chat-circle-dots":"<path d=\"M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Zm60,12A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a7.85,7.85,0,0,1,2.53-.42,8,8,0,0,1,4,1.08A88,88,0,0,0,216,128Z\"/>",
    "check":"<path d=\"M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z\"/>",
    "check-circle":"<path d=\"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z\"/>",
    "crown-fill":"<path d=\"M248,80a28,28,0,1,0-51.12,15.77l-26.79,33L146,73.4a28,28,0,1,0-36.06,0L85.91,128.74l-26.79-33a28,28,0,1,0-26.6,12L47,194.63A16,16,0,0,0,62.78,208H193.22A16,16,0,0,0,209,194.63l14.47-86.85A28,28,0,0,0,248,80ZM128,40a12,12,0,1,1-12,12A12,12,0,0,1,128,40ZM24,80A12,12,0,1,1,36,92,12,12,0,0,1,24,80ZM220,92a12,12,0,1,1,12-12A12,12,0,0,1,220,92Z\"/>",
    "flag":"<path d=\"M42.76,50A8,8,0,0,0,40,56V224a8,8,0,0,0,16,0V179.77c26.79-21.16,49.87-9.75,76.45,3.41,16.4,8.11,34.06,16.85,53,16.85,13.93,0,28.54-4.75,43.82-18a8,8,0,0,0,2.76-6V56A8,8,0,0,0,218.76,50c-28,24.23-51.72,12.49-79.21-1.12C111.07,34.76,78.78,18.79,42.76,50ZM216,172.25c-26.79,21.16-49.87,9.74-76.45-3.41-25-12.35-52.81-26.13-83.55-8.4V59.79c26.79-21.16,49.87-9.75,76.45,3.4,25,12.35,52.82,26.13,83.55,8.4Z\"/>",
    "gear":"<path d=\"M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z\"/>",
    "heart":"<path d=\"M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z\"/>",
    "house":"<path d=\"M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z\"/>",
    "image":"<path d=\"M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z\"/>",
    "list":"<path d=\"M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z\"/>",
    "magnifying-glass":"<path d=\"M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z\"/>",
    "plus":"<path d=\"M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z\"/>",
    "seal-check-fill":"<path d=\"M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-52.2,6.84-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z\"/>",
    "share-network":"<path d=\"M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z\"/>",
    "shopping-bag":"<path d=\"M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z\"/>",
    "star-fill":"<path d=\"M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z\"/>",
    "storefront":"<path d=\"M232,96a7.89,7.89,0,0,0-.3-2.2L217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.8A7.89,7.89,0,0,0,24,96h0v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96ZM54,48H202l11.42,40H42.61Zm50,56h48v8a24,24,0,0,1-48,0Zm-16,0v8a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8ZM200,208H56V151.2a40.57,40.57,0,0,0,8,.8,40,40,0,0,0,32-16,40,40,0,0,0,64,0,40,40,0,0,0,32,16,40.57,40.57,0,0,0,8-.8Zm4.93-75.8a8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48v8A24,24,0,0,1,204.93,132.2Z\"/>",
    "warning":"<path d=\"M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z\"/>",
    "warning-circle":"<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z\"/>"};
  function ic(name, cls) {
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 256 256" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- Data: real categories (apps/api/prisma/seed-catalog.json) + starter colours (§8.1) ---------- */
  var IMG = '../../../packages/assets/categories/images/';
  var CATS = [
    { slug: 'graphics-design', ka: 'დიზაინი', en: 'Graphics & Design', color: '#7C3AED', kids: ['ლოგო და ბრენდინგი', 'ვიზუალური დიზაინი', 'ვების და აპლიკაციის დიზაინი', 'პრინტული დიზაინი', 'მარკეტინგული დიზაინი', '3D დიზაინი', 'გარეკანის და შეფუთვის დიზაინი', 'არქიტექტურა და შენობების დიზაინი'] },
    { slug: 'music-audio', ka: 'მუსიკა და ხმა', en: 'Music & Audio', color: '#DB2777', kids: ['მუსიკის დაწერა', 'გახმოვანება', 'ხმის მონტაჟი', 'მუსიკის გაკვეთილები'] },
    { slug: 'programming-tech', ka: 'პროგრამირება და ტექნოლოგიები', en: 'Programming & Tech', color: '#2563EB', kids: ['ვებ-გვერდის განვითარება', 'ვებსაიტის პლათფორმები', 'ხელოვნური ინტელექტი', 'პროგრამული განვითარება', 'თამაშების განვითარება', 'ხარისხის უზრუნველყოფა'] },
    { slug: 'digital-marketing', ka: 'ციფრული მარკეტინგი', en: 'Digital Marketing', color: '#D99A00', kids: ['სოციალური მედია', 'ძებნა', 'ანალიტიკა და სტრატეგია', 'მეთოდები და თექნიკა', 'სხვა'] },
    { slug: 'video-animation', ka: 'ვიდეო და ანიმაცია', en: 'Video & Animation', color: '#0EA5E9', kids: ['რედაქტირება და პოსტის წარმოება', 'ანიმირებული გრაფიკა', 'პროდუქტის ვიდეო', 'განმარტებითი ვიდეოები', 'ხელოვნური ინტელექტის ვიდეო'] },
    { slug: 'business', ka: 'ბიზნესი', en: 'Business', color: '#1E3A8A', kids: ['ბიზნესის მენეჯმენტი', 'ფინანსური და იურიდიული კონსულტაცია', 'ელ. კომერციის მენეჯმენტი', 'გაყიდვები და მომხმარებელზე ზრუნვა', 'კონტენტის წერა'] },
    { slug: 'photography', ka: 'ფოტოგრაფია', en: 'Photography', color: '#4D9A1E', kids: ['პროდუქტები და ცხოვრების წესი', 'ხალხი და სცენები', 'სხვადასხვა'] }
  ];
  var SPARES = ['#C026D3', '#8B5E34', '#52606D', '#A3A30D', '#9F1239'];
  var SPARE_NAMES = ['fuchsia', 'bronze', 'slate', 'olive', 'wine'];
  var RESERVED = [
    { hex: '#29807E', ka: 'ბრენდის (ფირუზისფერი)', en: 'brand teal 600' },
    { hex: '#0D696C', ka: 'ბრენდის (ფირუზისფერი)', en: 'brand teal 700' },
    { hex: '#B91C1C', ka: 'შეცდომის (წითელი)', en: 'error red' },
    { hex: '#15803D', ka: 'წარმატების (მწვანე)', en: 'success green' },
    { hex: '#F48438', ka: '„გამორჩეულის“ (ნარინჯისფერი)', en: 'Featured orange' }
  ];
  var SIMILAR_DE = 0.08, RESERVED_DE = 0.06;
  var FEATURED_SLUGS = ['business', 'graphics-design', 'music-audio', 'photography', 'programming-tech'];
  var GIGS = [
    { cat: 0, title: 'შევქმნი უნიკალურ ლოგოს და სრულ ბრენდბუქს', seller: 'ნინო ბ.', ini: 'ნბ', rating: '4.9', count: 124, price: 80, featured: true },
    { cat: 2, title: 'გავაკეთებ თანამედროვე ვებ-გვერდს Next.js-ზე', seller: 'გიორგი მ.', ini: 'გმ', rating: '5.0', count: 37, price: 450 },
    { cat: 4, title: 'მოვამზადებ სარეკლამო ვიდეოს სოციალური ქსელებისთვის', seller: 'ანა კ.', ini: 'აკ', rating: null, count: 0, price: 120 },
    { cat: 3, title: 'ვმართავ თქვენი ბრენდის სოციალურ მედიას', seller: 'ლევან ჩ.', ini: 'ლჩ', rating: '4.8', count: 56, price: 300 },
    { cat: 6, title: 'გადავიღებ პროდუქტის პროფესიონალურ ფოტოებს', seller: 'მარიამ ტ.', ini: 'მტ', rating: '4.7', count: 18, price: 150 },
    { cat: 1, title: 'გავახმოვანებ თქვენს რეკლამას ქართულად', seller: 'დათო ლ.', ini: 'დლ', rating: '5.0', count: 9, price: 60 },
    { cat: 5, title: 'მოვამზადებ ბიზნეს-გეგმას და ფინანსურ მოდელს', seller: 'თამარ ხ.', ini: 'თხ', rating: '4.9', count: 41, price: 500, featured: true },
    { cat: 2, title: 'შევქმნი მობილურ აპლიკაციას iOS-ისა და Android-ისთვის', seller: 'ირაკლი ს.', ini: 'ის', rating: '4.6', count: 22, price: 1200 }
  ];
  var SELLERS = [
    { name: 'ნინო ბერიძე', ini: 'ნბ', skills: ['ლოგო', 'ბრენდინგი', 'Figma'] },
    { name: 'გიორგი მაისურაძე', ini: 'გმ', skills: ['React', 'Next.js', 'Node.js'] },
    { name: 'ანა კაპანაძე', ini: 'აკ', skills: ['მონტაჟი', 'Premiere', 'Motion'] },
    { name: 'ლევან ჩხეიძე', ini: 'ლჩ', skills: ['SMM', 'Meta Ads', 'SEO'] }
  ];

  /* ---------- Category colour function (copy of derive-category-color.mjs) ---------- */
  var hex2rgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }); };
  var rgb2hex = function (c) { return '#' + c.map(function (v) { return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'); }).join('').toUpperCase(); };
  var lin = function (v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  var delin = function (v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
  var lum = function (h) { var c = hex2rgb(h).map(lin); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  function contrast(a, b) { var x = lum(a), y = lum(b); var hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); }
  function toOklab(h) {
    var c = hex2rgb(h).map(lin), r = c[0], g = c[1], b = c[2];
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function fromOklab(v) {
    var L = v[0], a = v[1], b = v[2];
    var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  var inGamut = function (rgb) { return rgb.every(function (v) { return v >= -1e-4 && v <= 1 + 1e-4; }); };
  function toOklch(h) { var o = toOklab(h); return [o[0], Math.hypot(o[1], o[2]), ((Math.atan2(o[2], o[1]) * 180) / Math.PI + 360) % 360]; }
  function oklch(L, C, H) {
    L = Math.min(1, Math.max(0, L));
    for (var c = C; c >= 0; c -= 0.002) {
      var rgb = fromOklab([L, c * Math.cos((H * Math.PI) / 180), c * Math.sin((H * Math.PI) / 180)]);
      if (inGamut(rgb)) return rgb2hex(rgb.map(delin));
    }
    return rgb2hex(fromOklab([L, 0, 0]).map(delin));
  }
  function deltaE(a, b) { var p = toOklab(a), q = toOklab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }
  var T = {
    light: { surface: '#FFFFFF', canvas: '#FAFAFA', textDark: '#161616', textLight: '#FFFFFF' },
    dark: { surface: '#27272A', canvas: '#161616', textDark: '#161616', textLight: '#FFFFFF' }
  };
  function walk(L, C, H, dir, ok) {
    for (var l = L; l >= 0 && l <= 1; l += dir * 0.005) { var h = oklch(l, C, H); if (ok(h)) return h; }
    return dir > 0 ? '#FFFFFF' : '#000000';
  }
  function solidFor(L, C, H, mode) {
    var t = T[mode];
    var ends = function (l) { return [oklch(l + 0.05, C, H - 10), oklch(l - 0.05, C, H + 10)]; };
    var okWith = function (text) { return function (l) { return [oklch(l, C, H)].concat(ends(l)).every(function (x) { return contrast(x, text) >= 4.5; }); }; };
    var base = oklch(L, C, H);
    var text = contrast(base, t.textLight) >= contrast(base, t.textDark) ? t.textLight : t.textDark;
    var dir = text === t.textLight ? -1 : 1;
    var l = L;
    while (l > 0 && l < 1 && !okWith(text)(l)) l += dir * 0.005;
    var e = ends(l);
    return { solid: oklch(l, C, H), onSolid: text, gradientStart: e[0], gradientEnd: e[1] };
  }
  function deriveCategoryColor(baseHex) {
    var lch = toOklch(baseHex), L = lch[0], C = lch[1], H = lch[2];
    var out = {};
    ['light', 'dark'].forEach(function (mode) {
      var t = T[mode];
      var sL = mode === 'dark' ? Math.min(Math.max(L, 0.5), 0.78) : L;
      var sC = mode === 'dark' ? C * 0.9 : C;
      var s = solidFor(sL, sC, H, mode);
      var tint = mode === 'light' ? oklch(0.965, Math.min(C, 0.035), H) : oklch(0.3, Math.min(C, 0.06), H);
      var tintStrong = mode === 'light' ? oklch(0.92, Math.min(C, 0.07), H) : oklch(0.36, Math.min(C, 0.08), H);
      var dir = mode === 'light' ? -1 : 1;
      var ink = walk(mode === 'light' ? Math.min(L, 0.6) : Math.max(L, 0.7), C, H, dir, function (h) { return [t.surface, t.canvas, tint, tintStrong].every(function (bg) { return contrast(h, bg) >= 4.5; }); });
      var indicator = walk(L, C, H, dir, function (h) { return [t.surface, t.canvas].every(function (bg) { return contrast(h, bg) >= 3; }); });
      out[mode] = { solid: s.solid, onSolid: s.onSolid, gradientStart: s.gradientStart, gradientEnd: s.gradientEnd, tint: tint, tintStrong: tintStrong, ink: ink, indicator: indicator, glow: s.solid + (mode === 'light' ? '59' : '73') };
    });
    return out;
  }
  window.__rf = { deriveCategoryColor: deriveCategoryColor, contrast: contrast, deltaE: deltaE };

  var cache = {};
  function derived(hex) { return cache[hex] || (cache[hex] = deriveCategoryColor(hex)); }
  /* categoryStyle (§8.3): both sets inline; CSS picks light or dark. */
  function catStyle(hex) {
    var d = derived(hex), out = [];
    ['light', 'dark'].forEach(function (m) {
      var p = m === 'light' ? '--cat-l-' : '--cat-d-';
      Object.keys(d[m]).forEach(function (k) { out.push(p + k + ':' + d[m][k]); });
    });
    return out.join(';');
  }

  /* ---------- Templates (one markup, two looks) ---------- */
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LOGO = '../../../packages/assets/logo/mytask-logo-wordmark-trimmed.png';

  function header(look, opts) {
    opts = opts || {};
    var items = CATS.map(function (c, i) {
      return '<button type="button" class="catbar-item cat" data-cat="' + i + '" aria-expanded="false"' + (opts.current === i ? ' aria-current="page"' : '') + ' style="' + catStyle(c.color) + '">' + (look === 'new' ? '<span class="dot"></span>' : '') + esc(c.ka) + '</button>';
    }).join('');
    var drawer = CATS.map(function (c, i) {
      return '<li class="cat" style="' + catStyle(c.color) + '"><button type="button" class="drawer-row" aria-expanded="' + (i === 0 ? 'true' : 'false') + '">' + (look === 'new' ? '<span class="dot"></span>' : '') + esc(c.ka) + '</button><div class="drawer-sub">' + c.kids.slice(0, 4).map(function (k) { return '<a href="#">' + esc(k) + '</a>'; }).join('') + '</div></li>';
    }).join('');
    var btnP = look === 'new' ? 'btn btn-primary btn-sm' : 'btn btn-primary';
    var btnS = look === 'new' ? (opts.over ? 'btn btn-glass btn-sm' : 'btn btn-sm') : 'btn';
    return '<header class="hdr' + (opts.over ? ' over' : '') + '">' +
      '<div class="hdr-top"><img class="hdr-logo" src="' + LOGO + '" alt="MyTask">' +
      (opts.over ? '' : '<div class="hdr-search"><input class="input" type="search" placeholder="ძებნა" aria-label="ძებნა"></div>') +
      '<nav class="hdr-links" aria-label="მთავარი"><a class="hdr-link hide-sm" href="#">აღმოაჩინე</a><a class="hdr-link hide-sm" href="#">EN</a>' +
      '<a class="' + btnS + ' hide-sm" href="#">ავტორიზაცია</a><a class="' + btnP + ' hide-sm" href="#">შეუერთდი</a>' +
      '<button type="button" class="btn btn-icon hdr-burger" aria-label="მენიუ" aria-expanded="false">' + ic('list') + '</button></nav></div>' +
      '<div class="catbar-wrap"><nav class="catbar" aria-label="კატეგორიები">' + items + '</nav><div class="mega cat" role="region" aria-label="ქვეკატეგორიები"></div></div>' +
      '<div class="drawer"><ul>' + drawer + '</ul></div></header>';
  }

  function gigCard(g, look) {
    var c = CATS[g.cat];
    var cls = look === 'new' ? 'card gig' : 'card gig';
    return '<article class="' + cls + (g.featured ? (look === 'new' ? ' featured' : ' card-featured') : '') + ' reveal">' +
      (g.featured ? '<span class="badge-featured">' + ic('crown-fill') + ' გამორჩეული</span>' : '') +
      '<div class="gig-media"><img src="' + IMG + c.slug + '.webp" alt="" loading="lazy"></div>' +
      '<div class="gig-body"><div class="gig-seller"><span class="ava">' + esc(g.ini) + '</span>' + esc(g.seller) + '</div>' +
      '<h3 class="gig-title"><a href="#">' + esc(g.title) + '</a></h3>' +
      (g.rating ? '<div class="gig-rating">' + ic('star-fill') + '<strong>' + g.rating + '</strong> <span>(' + g.count + ')</span></div>' : '<div class="gig-rating" style="color:var(--mt-text-muted)">შეფასებები ჯერ არ არის</div>') +
      '<div class="gig-price"><span>საწყისი ფასი</span><strong>₾' + g.price + '</strong></div></div></article>';
  }

  function tiles(look) {
    return FEATURED_SLUGS.map(function (slug) {
      var c = CATS.filter(function (x) { return x.slug === slug; })[0];
      if (look === 'new') {
        return '<a class="tile cat reveal" href="#" style="' + catStyle(c.color) + '"><div class="tile-img"><img src="' + IMG + slug + '.webp" alt="" loading="lazy"></div><span class="tile-band">' + esc(c.ka) + ic('caret-right') + '</span></a>';
      }
      return '<a class="tile" href="#"><img src="' + IMG + slug + '.webp" alt="" loading="lazy"><span class="tile-label">' + esc(c.ka) + '</span></a>';
    }).join('');
  }

  function catRow(i, look) {
    var c = CATS[i];
    var gigs = GIGS.filter(function (g) { return g.cat === i; }).concat(GIGS).slice(0, 4);
    var more = look === 'new' ? '<a class="btn btn-ghost btn-sm" href="#">მეტის ნახვა ' + ic('caret-right') + '</a>' : '<a class="more" href="#" style="color:var(--mt-text-link)">მეტის ნახვა</a>';
    return '<section class="sec cat" style="' + catStyle(c.color) + '"><div class="sec-head cat-row"><h2>' + (look === 'new' ? '<span class="dot"></span>' : '') + esc(c.ka) + '</h2>' + more + '</div>' +
      '<div class="grid scroll">' + gigs.map(function (g) { return gigCard(g, look); }).join('') + '</div></section>';
  }

  function sellers(look) {
    return SELLERS.map(function (s) {
      return '<article class="card fl reveal"><span class="ava">' + esc(s.ini) + '</span><div class="fl-name">' + esc(s.name) + ic('seal-check-fill') + '</div>' +
        '<div class="fl-skills">' + s.skills.map(function (k) { return '<a class="chip" href="#">' + esc(k) + '</a>'; }).join('') + '</div>' +
        '<div class="pv-row" style="justify-content:center"><a class="btn btn-sm" href="#">პროფილის ნახვა</a></div></article>';
    }).join('');
  }

  function home(look) {
    var shortcut = look === 'new' ? 'btn btn-glass' : 'btn';
    return '<div class="hero">' + header(look, { over: true }) +
      '<div class="hero-body"><h1>იპოვე საუკეთესო ფრილანსერი</h1>' +
      '<div class="hero-search"><input class="input" type="search" placeholder="რას ეძებთ ?" aria-label="ძებნა"><button class="btn btn-primary" type="button">' + ic('magnifying-glass') + 'ძებნა</button></div>' +
      '<div class="hero-short"><a class="' + shortcut + '" href="#">' + ic('storefront') + 'განცხადებები</a><a class="' + shortcut + '" href="#">' + ic('briefcase') + 'პროექტები</a></div></div></div>' +
      '<div style="padding:0 16px 24px">' +
      '<section class="sec"><div class="sec-head"><h2>გამორჩეული კატეგორიები</h2></div><div class="tiles">' + tiles(look) + '</div></section>' +
      '<section class="sec"><div class="sec-head"><h2>ტოპ განცხადებები</h2></div><div class="grid scroll">' + GIGS.slice(0, 4).map(function (g) { return gigCard(g, look); }).join('') + '</div></section>' +
      catRow(2, look) + catRow(4, look) +
      '<section class="sec"><div class="sec-head"><h2>საუკეთესო ფრილანსერები</h2></div><div class="grid scroll">' + sellers(look) + '</div></section></div>';
  }

  function catPage(look, which) {
    var isCat = which !== 'search';
    var c = isCat ? CATS[which] : null;
    var style = isCat ? ' style="' + catStyle(c.color) + '"' : '';
    var title = isCat ? c.kids[0] : 'ძიების შედეგები: „ლოგო“';
    var crumbs = isCat ? '<nav class="crumbs" aria-label="ნავიგაცია"><a href="#">მთავარი</a><span class="sep">/</span><a href="#">' + esc(c.ka) + '</a><span class="sep">/</span><span>' + esc(c.kids[0]) + '</span></nav>' : '';
    var head = look === 'new'
      ? '<div class="cat-head">' + crumbs + '<div class="cat-band"><h1>' + esc(title) + '</h1><p style="margin-top:6px;opacity:.92">' + (isCat ? '1 248 განცხადება' : '312 შედეგი') + '</p></div>' + (isCat ? '<p class="cat-desc">იპოვე გამოცდილი ფრილანსერები ამ მიმართულებით — შეადარე ფასები, შეფასებები და მიწოდების დრო.</p>' : '') + '</div>'
      : '<div class="cat-head">' + crumbs + '<h1>' + esc(title) + '</h1>' + (isCat ? '<p class="cat-desc">იპოვე გამოცდილი ფრილანსერები ამ მიმართულებით — შეადარე ფასები, შეფასებები და მიწოდების დრო.</p>' : '') + '</div>';
    var kids = isCat ? '<div class="pv-row" style="margin-bottom:14px">' + c.kids.slice(0, 5).map(function (k, j) { return '<button type="button" class="chip' + (look === 'new' ? ' cat-chip' : '') + '" aria-pressed="' + (j === 0) + '">' + (look === 'new' ? '<span class="dot"></span>' : '') + esc(k) + '</button>'; }).join('') + '</div>' : '';
    var pager = look === 'new'
      ? '<nav class="pager" aria-label="გვერდები"><a class="btn btn-ghost" href="#" aria-label="წინა">' + ic('caret-left') + '</a><a class="btn btn-primary" href="#" aria-current="page">1</a><a class="btn btn-ghost" href="#">2</a><a class="btn btn-ghost" href="#">3</a><a class="btn btn-ghost" href="#" aria-label="შემდეგი">' + ic('caret-right') + '</a></nav>'
      : '<nav class="pager" aria-label="გვერდები"><a href="#">‹</a><a href="#" aria-current="page">1</a><a href="#">2</a><a href="#">3</a><a href="#">›</a></nav>';
    var gigs = (isCat ? GIGS.filter(function (g) { return g.cat === which; }) : []).concat(GIGS).slice(0, 4);
    return '<div class="cat"' + style + '>' + head + kids +
      '<div class="filters surface"><select class="input" aria-label="ფასი"><option>ფასი</option></select><select class="input" aria-label="მიწოდების დრო"><option>მიწოდების დრო</option></select><select class="input" aria-label="რეიტინგი"><option>რეიტინგი</option></select>' +
      '<span style="margin-inline-start:auto" class="pv-row"><select class="input" aria-label="დალაგება"><option>დალაგება: რეკომენდებული</option></select><button type="button" class="btn ' + (look === 'new' ? 'btn-ghost' : '') + '">ფილტრის გასუფთავება</button></span></div>' +
      '<div class="grid">' + gigs.map(function (g) { return gigCard(g, look); }).join('') + '</div>' + pager + '</div>';
  }

  function profile(look) {
    return '<div class="pv-row" style="align-items:flex-start;gap:20px">' +
      '<article class="card prof"><span class="ava">ნბ</span><div><div class="fl-name" style="justify-content:center;font-size:18px">ნინო ბერიძე ' + ic('seal-check-fill') + '</div><div style="color:var(--mt-text-secondary);font-size:14px">ლოგოს და ბრენდინგის დიზაინერი</div></div>' +
      '<div class="prof-actions"><a class="btn btn-primary" href="#">' + ic('chat-circle-dots') + 'შეტყობინების გაგზავნა</a><button type="button" class="btn btn-icon" aria-label="გაზიარება" data-open-dialog>' + ic('share-network') + '</button></div>' +
      '<div class="bars">' + [['5', 86], ['4', 10], ['3', 3], ['2', 1], ['1', 0]].map(function (b) { return '<div class="bar"><span>' + b[0] + '★</span><span class="bar-track"><span class="bar-fill" style="width:' + b[1] + '%"></span></span><span>' + b[1] + '%</span></div>'; }).join('') + '</div>' +
      '<div class="fl-skills">' + ['ლოგო', 'ბრენდინგი', 'Illustrator', 'Figma'].map(function (k) { return '<a class="chip" href="#">' + k + '</a>'; }).join('') + '</div>' +
      '<button type="button" class="btn ' + (look === 'new' ? 'btn-ghost' : '') + ' btn-sm" data-open-dialog>' + ic('flag') + 'მომხმარებლის გასაჩივრება</button></article></div>';
  }

  function dashboard(look) {
    var stats = [['wallet', 'გამომუშავება', '₾ 2 480'], ['shopping-bag', 'შეკვეთები', '14'], ['chat-circle-dots', 'შეტყობინებები', '3'], ['trend-up', 'ნახვები', '1 096']];
    return '<div style="margin-bottom:16px" class="pv-row"><div class="switcher" data-pos="1" role="navigation" aria-label="Buying / Selling">' + (look === 'new' ? '<span class="thumb"></span>' : '') + '<button type="button">ყიდვა</button><button type="button" aria-current="page">გაყიდვა</button></div></div>' +
      '<div class="dash"><nav class="card side" aria-label="პანელი"><a href="#" aria-current="page">' + ic('house') + 'მთავარი</a><a href="#">' + ic('storefront') + 'განცხადებები</a><a href="#">' + ic('shopping-bag') + 'შეკვეთები</a><a href="#">' + ic('image') + 'პორტფოლიო</a><a href="#">' + ic('gear') + 'პარამეტრები</a></nav>' +
      '<div><div class="stats">' + stats.map(function (s, i) { return '<a href="#" class="card stat link reveal" style="--i:' + i + '"><span class="stat-head"><span class="stat-ico">' + ic(s[0]) + '</span>' + s[1] + '</span><span class="stat-val">' + s[2] + '</span></a>'; }).join('') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="empty"><span class="empty-icon">' + ic('shopping-bag') + '</span><strong>აქტიური შეკვეთები ჯერ არ არის</strong><p>როცა მყიდველი შეუკვეთავს, შეკვეთა აქ გამოჩნდება.</p><a class="btn btn-primary btn-sm" href="#">' + ic('plus') + 'ახალი განცხადება</a></div></div></div></div>';
  }

  var GOOGLE = '<svg class="social-ico" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  function auth(look) {
    return '<form class="card auth" onsubmit="return false"><h1>ავტორიზაცია</h1><p class="sub">შედი შენს MyTask ანგარიშზე</p>' +
      '<div class="field"><label for="em-' + look + '">ელ-ფოსტა</label><input class="input" id="em-' + look + '" type="email" value="nino@example.ge"></div>' +
      '<div class="field"><label for="pw-' + look + '">პაროლი</label><input class="input" id="pw-' + look + '" type="password" value="password" aria-invalid="' + (look === 'new') + '"><span class="err">' + (look === 'new' ? 'პაროლი არასწორია' : '') + '</span></div>' +
      '<div class="row"><label class="cb"><input type="checkbox" checked><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></span>დამიმახსოვრე</label><a href="#">დაგავიწყდა პაროლი?</a></div>' +
      '<button class="btn btn-primary" type="button" data-demo="loading">ავტორიზაცია</button><div class="or">ან</div>' +
      '<button class="btn" type="button">' + GOOGLE + 'Google-ით შესვლა</button>' +
      '<div class="links"><a href="#">რეგისტრაცია</a><a href="#">წესები და პირობები</a><a href="#">კონფიდენციალურობა</a><a href="#">მთავარზე დაბრუნება</a></div></form>';
  }

  function buttons(look) {
    var variants = [['btn-primary', 'მთავარი'], ['', 'მეორადი'], ['btn-accent', 'Premium'], ['btn-danger', 'წაშლა'], ['btn-ghost', 'გაუქმება']];
    var states = [['', 'rest'], ['is-hover', 'hover'], ['is-active', 'pressed'], ['is-focus', 'focus'], ['disabled', 'disabled']];
    var rows = variants.map(function (v) {
      return '<tr><th scope="row">' + v[1] + '</th>' + states.map(function (s) {
        return '<td><button type="button" class="btn ' + v[0] + ' ' + (s[0] !== 'disabled' ? s[0] : '') + '"' + (s[0] === 'disabled' ? ' disabled' : '') + '>' + v[1] + '</button></td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="pal-wrap"><table class="pal"><thead><tr><th></th>' + states.map(function (s) { return '<th>' + s[1] + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="pv-row" style="margin-top:12px"><button type="button" class="btn btn-icon" aria-label="ძებნა">' + ic('magnifying-glass') + '</button><button type="button" class="btn btn-icon" aria-label="რჩეული">' + ic('heart') + '</button>' +
      '<button type="button" class="btn btn-primary" data-demo="loading">შენახვა (try: loading → saved)</button><button type="button" class="btn" data-open-dialog>Dialog</button><button type="button" class="btn" data-toast>Toast</button></div>';
  }

  function controls(look) {
    return '<div class="pv-row" style="align-items:flex-start;gap:24px">' +
      '<div style="display:grid;gap:10px;min-width:240px;flex:1"><div class="field"><label>ტექსტი</label><input class="input" placeholder="მაგ. ლოგოს დიზაინი"></div><div class="field"><label>ფოკუსში</label><input class="input is-focus" value="ფოკუსი"></div><div class="field"><label>შეცდომა</label><input class="input" aria-invalid="true" value="x"><span class="err">ველის შევსება აუცილებელია</span></div></div>' +
      '<div style="display:grid;gap:14px;min-width:240px;flex:1">' +
      '<div class="pv-row">' + ['ლოგო', 'ბრენდინგი', 'Figma'].map(function (k, i) { return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" aria-pressed="' + (i === 0) + '">' + k + '</button>'; }).join('') + '</div>' +
      '<div class="pv-row"><span class="pill pill-success">აქტიურია</span><span class="pill pill-warning">მომლოდინე</span><span class="pill pill-danger">უარყოფილია</span><span class="pill pill-info">ახალი</span></div>' +
      '<div class="tabs" role="tablist"><button role="tab" type="button" aria-selected="true">მომლოდინე</button><button role="tab" type="button" aria-selected="false">აქტიური</button><button role="tab" type="button" aria-selected="false">უარყოფილი</button>' + (look === 'new' ? '<span class="ind"></span>' : '') + '</div>' +
      '<div class="pv-row"><label class="sw"><input type="checkbox" checked><span class="track"><span class="knob"></span></span>ელ-ფოსტით შეტყობინებები</label><label class="cb"><input type="checkbox"><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></span>ვეთანხმები</label></div>' +
      '<div class="alert alert-success">ცვლილებები შენახულია.</div><div class="alert alert-danger">რაღაც შეცდომა მოხდა, სცადე თავიდან.</div>' +
      '<div style="display:grid;gap:8px"><span class="skel" style="width:70%"></span><span class="skel" style="width:45%"></span><span class="skel box"></span></div></div></div>';
  }

  /* ---------- Palette table + admin picker (new only: the feature is NEW) ---------- */
  function swatchLine(d, m, name) {
    var x = d[m];
    return '<div class="sw-mode ' + m + '"><span class="sw-solid" style="background:linear-gradient(135deg,' + x.gradientStart + ',' + x.gradientEnd + ');color:' + x.onSolid + '">' + esc(name) + '</span>' +
      '<span class="sw-chip" style="background:' + x.tint + ';border-color:' + x.tintStrong + ';color:' + x.ink + '"><span class="dot" style="background:' + x.indicator + '"></span>' + esc(name) + '</span></div>';
  }
  function palette() {
    var rows = CATS.map(function (c) { return { name: c.ka, sub: c.en, hex: c.color }; }).concat(SPARES.map(function (h, i) { return { name: 'S' + (i + 1), sub: 'spare · ' + SPARE_NAMES[i], hex: h }; }));
    return '<div class="pal-wrap"><table class="pal"><thead><tr><th>Category</th><th>Base</th><th>Light</th><th>Dark</th><th>Text on solid (L / D)</th><th>Closest colour</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var d = derived(r.hex);
        var near = rows.filter(function (o) { return o.hex !== r.hex; }).map(function (o) { return [deltaE(r.hex, o.hex), o.name]; }).sort(function (a, b) { return a[0] - b[0]; })[0];
        var minC = function (m) { var x = d[m]; return Math.min(contrast(x.solid, x.onSolid), contrast(x.gradientStart, x.onSolid), contrast(x.gradientEnd, x.onSolid)).toFixed(2); };
        return '<tr><td><strong>' + esc(r.name) + '</strong><div class="pv-cap">' + esc(r.sub) + '</div></td><td><span class="pv-row"><span class="swatch" style="background:' + r.hex + ';cursor:default"></span><code>' + r.hex + '</code></span></td>' +
          '<td>' + swatchLine(d, 'light', r.name) + '</td><td>' + swatchLine(d, 'dark', r.name) + '</td><td><code>' + minC('light') + ' / ' + minC('dark') + '</code></td><td class="pv-cap">' + esc(near[1]) + ' · ΔE ' + near[0].toFixed(3) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var picker = { cat: 2, hex: CATS[2].color };
  function previewBox(hex, m, name) {
    var x = derived(hex)[m];
    return '<div class="prev ' + m + '"><span class="cap">' + (m === 'light' ? 'Light' : 'Dark') + '</span>' +
      '<span class="p-pill" style="background:linear-gradient(180deg,' + x.tint + ',' + x.tintStrong + ');border-color:' + x.tintStrong + ';color:' + x.ink + '"><span class="dot" style="background:' + x.indicator + '"></span>' + esc(name) + '</span>' +
      '<span class="p-pill" style="background:linear-gradient(135deg,' + x.gradientStart + ',' + x.gradientEnd + ');border-color:' + x.gradientEnd + ';color:' + x.onSolid + ';box-shadow:0 0 0 3px ' + x.glow + '"><span class="dot" style="background:' + x.onSolid + '"></span>' + esc(name) + '</span>' +
      '<span class="p-band" style="background:linear-gradient(135deg,' + x.gradientStart + ',' + x.gradientEnd + ');color:' + x.onSolid + '">' + esc(name) + '</span>' +
      '<span class="p-crumb" style="background:' + x.tint + ';border-color:' + x.tintStrong + ';color:' + x.ink + '">' + esc(name) + '</span>' +
      '<span class="p-ink" style="color:' + x.ink + '">ტექსტი კატეგორიის ფერში</span></div>';
  }
  function validate(hex, catIndex) {
    var out = [];
    if (!/^#[0-9A-F]{6}$/.test(hex)) return [{ k: 'err', t: 'შეიყვანე ფერი ფორმატით #RRGGBB.', en: 'Enter a colour as #RRGGBB.' }];
    CATS.forEach(function (c, i) {
      if (i === catIndex) return;
      if (c.color.toUpperCase() === hex) out.push({ k: 'err', t: 'ეს ფერი უკვე გამოყენებულია კატეგორიაში „' + c.ka + '“.', en: 'Already used by “' + c.en + '”. Saving is refused.' });
      else if (deltaE(c.color, hex) < SIMILAR_DE) out.push({ k: 'warn', t: 'ძალიან ჰგავს კატეგორიის „' + c.ka + '“ ფერს.', en: 'Very similar to “' + c.en + '” (ΔE ' + deltaE(c.color, hex).toFixed(3) + '). You can still save.' });
    });
    var seen = {};
    RESERVED.forEach(function (r) {
      var d = deltaE(r.hex, hex);
      if (d < RESERVED_DE && !seen[r.ka]) { seen[r.ka] = 1; out.push({ k: 'warn', t: 'შეიძლება აერიოს ' + r.ka + ' ფერში.', en: 'May be confused with the ' + r.en + ' colour (ΔE ' + d.toFixed(3) + '). You can still save.' }); }
    });
    if (!out.length) out.push({ k: 'ok', t: 'ფერი შესაფერისია.', en: 'Good: distinct and readable.' });
    return out;
  }
  function renderPicker() {
    var root = document.getElementById('admin-picker');
    if (!root) return;
    var c = CATS[picker.cat];
    var used = {};
    CATS.forEach(function (x, i) { if (i !== picker.cat) used[x.color.toUpperCase()] = x; });
    var sw = CATS.map(function (x) { return x.color; }).concat(SPARES).map(function (h) {
      var u = used[h.toUpperCase()];
      return '<button type="button" class="swatch" data-hex="' + h + '" style="background:' + h + '" aria-pressed="' + (h.toUpperCase() === picker.hex) + '"' + (u ? ' disabled aria-label="გამოყენებულია: ' + esc(u.ka) + '" title="გამოყენებულია: ' + esc(u.ka) + ' (Used by ' + esc(u.en) + ')"' : ' aria-label="' + h + '" title="' + h + '"') + '></button>';
    }).join('');
    var msgs = validate(picker.hex, picker.cat);
    var valid = /^#[0-9A-F]{6}$/.test(picker.hex);
    root.querySelector('[data-slot=cat-select]').value = String(picker.cat);
    root.querySelector('[data-slot=name]').value = c.ka;
    root.querySelector('[data-slot=color]').value = valid ? picker.hex.toLowerCase() : '#000000';
    var hexInput = root.querySelector('[data-slot=hex]');
    if (document.activeElement !== hexInput) hexInput.value = picker.hex;
    hexInput.setAttribute('aria-invalid', String(msgs.some(function (m) { return m.k === 'err'; })));
    root.querySelector('[data-slot=swatches]').innerHTML = sw;
    root.querySelector('[data-slot=msgs]').innerHTML = msgs.map(function (m) { return '<div class="msg ' + m.k + '">' + ic(m.k === 'ok' ? 'check-circle' : m.k === 'err' ? 'warning-circle' : 'warning') + '<span>' + esc(m.t) + '<br><span class="pv-cap">' + esc(m.en) + '</span></span></div>'; }).join('');
    root.querySelector('[data-slot=preview]').innerHTML = valid ? previewBox(picker.hex, 'light', c.ka) + previewBox(picker.hex, 'dark', c.ka) : '';
    var tree = CATS.map(function (x, i) { return '<li><span class="dot" style="background:' + derived(x.color).light.indicator + '"></span><strong>' + esc(x.ka) + '</strong><code style="margin-inline-start:auto">' + x.color + '</code></li>' + (i === picker.cat ? x.kids.slice(0, 2).map(function (k) { return '<li class="sub"><span class="dot" style="background:' + derived(x.color).light.indicator + ';opacity:.6"></span>' + esc(k) + ' <span class="pv-cap">(inherited)</span></li>'; }).join('') : ''); }).join('');
    root.querySelector('[data-slot=tree]').innerHTML = tree;
    root.querySelector('[data-slot=inherit]').innerHTML = '<span class="dot" style="background:' + derived(c.color).light.indicator + '"></span>ფერი მემკვიდრეობით მიიღება კატეგორიიდან „' + esc(c.ka) + '“.<br><span class="pv-cap">(Colour inherited from “' + esc(c.en) + '”.)</span>';
  }

  /* ---------- Mounting ---------- */
  var catPageWhich = 2;
  function mount() {
    var R = {
      header: function (l) { return header(l); },
      home: home,
      catpage: function (l) { return catPage(l, catPageWhich); },
      profile: profile,
      dashboard: dashboard,
      auth: auth,
      buttons: buttons,
      controls: controls,
      palette: function () { return palette(); }
    };
    document.querySelectorAll('[data-render]').forEach(function (el) {
      var f = R[el.getAttribute('data-render')];
      if (f) el.innerHTML = f(el.getAttribute('data-look') || 'new');
    });
    renderPicker();
    document.querySelectorAll('.tabs').forEach(moveInd);
    setupReveal();
  }

  /* ---------- Interactions ---------- */
  function openMega(item) {
    var wrap = item.closest('.catbar-wrap'), mega = wrap.querySelector('.mega');
    var c = CATS[+item.getAttribute('data-cat')];
    wrap.querySelectorAll('.catbar-item').forEach(function (b) { b.setAttribute('aria-expanded', String(b === item)); });
    mega.setAttribute('style', catStyle(c.color));
    var isNew = !!item.closest('.new');
    mega.innerHTML = '<h3>' + (isNew ? '<span class="dot"></span>' : '') + esc(c.ka) + '</h3><ul>' + c.kids.map(function (k) { return '<li><a href="#">' + esc(k) + '</a></li>'; }).join('') + '</ul>';
    mega.classList.add('open');
  }
  function closeMega(wrap) {
    if (!wrap) return;
    wrap.querySelectorAll('.catbar-item').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    var m = wrap.querySelector('.mega'); if (m) m.classList.remove('open');
  }
  function moveInd(tabs) {
    var ind = tabs.querySelector('.ind'), sel = tabs.querySelector('[aria-selected=true]');
    if (!ind || !sel) return;
    ind.style.width = sel.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + sel.offsetLeft + 'px)';
  }
  var dialogTrigger = null;
  function openDialog(trigger) {
    dialogTrigger = trigger;
    var s = document.getElementById('dlg');
    s.classList.add('open'); s.removeAttribute('aria-hidden');
    setTimeout(function () { var f = s.querySelector('textarea'); if (f) f.focus(); }, 30);
  }
  function closeDialog() {
    var s = document.getElementById('dlg');
    s.classList.remove('open'); s.setAttribute('aria-hidden', 'true');
    if (dialogTrigger) dialogTrigger.focus();
  }
  var toastTimer;
  function toast(text) {
    var t = document.getElementById('toast');
    t.querySelector('span').textContent = text;
    t.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var pv = t.closest('.pv-seg button');
    if (pv) { setPref(pv.parentElement.getAttribute('data-pref'), pv.getAttribute('data-val')); return; }
    var item = t.closest('.catbar-item');
    if (item) { if (item.getAttribute('aria-expanded') === 'true') closeMega(item.closest('.catbar-wrap')); else openMega(item); return; }
    var burger = t.closest('.hdr-burger');
    if (burger) { var dr = burger.closest('.hdr').querySelector('.drawer'); var open = dr.classList.toggle('open'); burger.setAttribute('aria-expanded', String(open)); return; }
    var row = t.closest('.drawer-row');
    if (row) { row.setAttribute('aria-expanded', String(row.getAttribute('aria-expanded') !== 'true')); return; }
    var sb = t.closest('.switcher button');
    if (sb) { var sw = sb.parentElement, bs = sw.querySelectorAll('button'); bs.forEach(function (b, i) { if (b === sb) { b.setAttribute('aria-current', 'page'); sw.setAttribute('data-pos', String(i)); } else b.removeAttribute('aria-current'); }); return; }
    var tab = t.closest('.tabs [role=tab]');
    if (tab) { tab.parentElement.querySelectorAll('[role=tab]').forEach(function (b) { b.setAttribute('aria-selected', String(b === tab)); }); moveInd(tab.parentElement); return; }
    var chip = t.closest('button.chip');
    if (chip) {
      if (chip.classList.contains('cat-chip')) chip.parentElement.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      else { var on = chip.getAttribute('aria-pressed') !== 'true'; chip.setAttribute('aria-pressed', String(on)); chip.classList.toggle('on', on); }
      return;
    }
    if (t.closest('[data-open-dialog]')) { openDialog(t.closest('[data-open-dialog]')); return; }
    if (t.closest('[data-close]') || t.id === 'dlg') { closeDialog(); return; }
    if (t.closest('[data-toast]')) { toast('ცვლილებები შენახულია'); return; }
    var demo = t.closest('[data-demo=loading]');
    if (demo && demo.getAttribute('aria-busy') !== 'true') {
      var label = demo.innerHTML;
      demo.setAttribute('aria-busy', 'true'); demo.innerHTML = '<span class="spin" aria-hidden="true"></span>' + label;
      setTimeout(function () {
        demo.removeAttribute('aria-busy'); demo.innerHTML = ic('check') + 'შენახულია';
        if (demo.closest('.new')) demo.classList.add('is-success');
        setTimeout(function () { demo.classList.remove('is-success'); demo.innerHTML = label; }, 1400);
      }, 1200);
      return;
    }
    var swb = t.closest('#admin-picker .swatch');
    if (swb && !swb.disabled) { picker.hex = swb.getAttribute('data-hex').toUpperCase(); renderPicker(); return; }
    if (t.closest('[data-slot=save]')) {
      var errs = validate(picker.hex, picker.cat).filter(function (m) { return m.k === 'err'; });
      if (errs.length) { toast('შენახვა ვერ მოხერხდა: ' + errs[0].t); return; }
      CATS[picker.cat].color = picker.hex;
      mount(); toast('შენახულია — ფერი ყველგან განახლდა');
      return;
    }
    if (t.closest('[data-replay]')) { document.querySelectorAll('.reveal').forEach(function (r) { r.classList.remove('seen'); }); setTimeout(setupReveal, 60); return; }
    // click outside a mega-menu closes it
    document.querySelectorAll('.mega.open').forEach(function (m) { if (!m.contains(t)) closeMega(m.closest('.catbar-wrap')); });
  });
  document.addEventListener('mouseover', function (e) {
    var item = e.target.closest && e.target.closest('.catbar-item');
    if (item && window.matchMedia('(hover: hover)').matches && item.getAttribute('aria-expanded') !== 'true') openMega(item);
  });
  document.addEventListener('mouseout', function (e) {
    var wrap = e.target.closest && e.target.closest('.catbar-wrap');
    if (wrap && !wrap.contains(e.relatedTarget)) closeMega(wrap);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('dlg').classList.contains('open')) closeDialog();
    document.querySelectorAll('.mega.open').forEach(function (m) { var w = m.closest('.catbar-wrap'); closeMega(w); var b = w.querySelector('.catbar-item'); if (b) b.focus(); });
  });
  document.addEventListener('input', function (e) {
    var s = e.target.getAttribute && e.target.getAttribute('data-slot');
    if (s === 'color') { picker.hex = e.target.value.toUpperCase(); renderPicker(); }
    if (s === 'hex') { var v = e.target.value.trim().toUpperCase(); if (v && v[0] !== '#') v = '#' + v; picker.hex = v; renderPicker(); }
  });
  document.addEventListener('change', function (e) {
    var s = e.target.getAttribute && e.target.getAttribute('data-slot');
    if (s === 'cat-select') { picker.cat = +e.target.value; picker.hex = CATS[picker.cat].color; renderPicker(); }
    if (s === 'hex') { e.target.value = picker.hex; }
    if (e.target.id === 'catpage-which') { catPageWhich = e.target.value === 'search' ? 'search' : +e.target.value; document.querySelectorAll('[data-render=catpage]').forEach(function (el) { el.innerHTML = catPage(el.getAttribute('data-look'), catPageWhich); }); setupReveal(); }
  });
  window.addEventListener('resize', function () { document.querySelectorAll('.tabs').forEach(moveInd); });

  /* ---------- Entrance (M-10) ---------- */
  var io;
  function setupReveal() {
    var els = document.querySelectorAll('.new .reveal:not(.seen)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (r) { r.classList.add('seen'); }); return; }
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('.new .grid, .new .tiles, .new .stats').forEach(function (g) {
      Array.prototype.forEach.call(g.querySelectorAll('.reveal'), function (r, i) { r.style.setProperty('--i', String(Math.min(i, 7))); });
    });
    els.forEach(function (r) { io.observe(r); });
    document.documentElement.setAttribute('data-reveal', 'ready');
  }

  /* ---------- Preview switches ---------- */
  function store(k, v) { try { window.localStorage.setItem('mt-refresh-' + k, v); } catch (err) { /* private mode */ } }
  function read(k) { try { return window.localStorage.getItem('mt-refresh-' + k); } catch (err) { return null; } }
  var ATTR = { theme: 'data-theme', motion: 'data-motion', width: 'data-width', compare: 'data-compare' };
  function setPref(k, v) {
    document.documentElement.setAttribute(ATTR[k], v); store(k, v);
    document.querySelectorAll('.pv-seg[data-pref=' + k + '] button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-val') === v)); });
    if (k === 'width' || k === 'compare') setTimeout(function () { document.querySelectorAll('.tabs').forEach(moveInd); }, 50);
  }
  function initPrefs() {
    var sysReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPref('theme', read('theme') || document.documentElement.getAttribute('data-theme') || 'light');
    setPref('motion', read('motion') || (sysReduced ? 'reduced' : 'full'));
    setPref('width', read('width') || 'desktop');
    setPref('compare', read('compare') || 'both');
  }

  initPrefs();
  mount();
})();
