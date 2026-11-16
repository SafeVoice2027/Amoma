import type { Language } from "@/lib/i18n/languages";

// Content for the student "Learn & Prevent" corner (app/student/learn).
//
// Plain, short, student-friendly language. The Tagalog and Bisaya versions were
// written by the developer, not a native-speaker translator — have a teacher or
// the Guidance Counselor read them before a wide rollout. Common school terms
// (Guidance Counselor, adviser, Admin) are kept in English on purpose, as they
// are used in Philippine schools.
//
// Nothing here quotes a hotline or contact number the school hasn't confirmed:
// the only number is 911, the national emergency line.

type L = Record<Language, string>;

export type LearnIcon = "book" | "layers" | "heart-handshake" | "users" | "smartphone" | "heart" | "scale";

export interface LearnTopic {
  id: string;
  icon: LearnIcon;
  title: L;
  intro: L;
  points: L[];
  // Show the "make a report" button at the end of this topic.
  reportCta?: boolean;
}

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "what-is-bullying",
    icon: "book",
    title: {
      en: "What is bullying?",
      tl: "Ano ang bullying?",
      ceb: "Unsa ang bullying?",
    },
    intro: {
      en: "Bullying is when someone hurts, scares, or leaves out another person on purpose, again and again, and it is hard for that person to make it stop.",
      tl: "Ang bullying ay kapag sinasadya ng isang tao na saktan, takutin, o ibukod ang iba, paulit-ulit, at mahirap itong patigilin ng nabu-bully.",
      ceb: "Ang bullying kay kung tinuyo nga sakiton, hadlokon, o isalikway sa usa ka tawo ang uban, balik-balik, ug lisod kini pahunongon sa gi-bully.",
    },
    points: [
      {
        en: "It is on purpose. The person means to hurt, scare, or embarrass.",
        tl: "Sinasadya ito. Gusto talaga nilang manakit, manakot, o magpahiya.",
        ceb: "Tinuyo kini. Gusto gyud nilang manakit, manghadlok, o magpakaulaw.",
      },
      {
        en: "It happens more than once, or keeps being threatened.",
        tl: "Paulit-ulit itong nangyayari, o patuloy na nananakot.",
        ceb: "Balik-balik kini mahitabo, o padayon ang hulga.",
      },
      {
        en: "It is not a fair fight. The person doing it may be older, stronger, more popular, or part of a group.",
        tl: "Hindi ito patas na away. Maaaring mas matanda, mas malakas, mas sikat, o grupo ang gumagawa.",
        ceb: "Dili kini patas nga away. Mahimong mas tigulang, mas kusgan, mas sikat, o grupo ang naghimo.",
      },
      {
        en: "A joke that everyone laughs at is not bullying. But if someone keeps getting hurt, it matters. Tell an adult.",
        tl: "Ang biro na pareho kayong natatawa ay hindi bullying. Pero kung may patuloy na nasasaktan, mahalaga pa rin ito. Magsabi sa isang adult.",
        ceb: "Ang lingaw nga nagkatawa ang tanan dili bullying. Apan kung adunay padayon nga nasakitan, importante kini. Pagsulti sa usa ka adult.",
      },
    ],
  },
  {
    id: "types",
    icon: "layers",
    title: {
      en: "Types of bullying",
      tl: "Mga uri ng bullying",
      ceb: "Mga matang sa bullying",
    },
    intro: {
      en: "Bullying is not only hitting. It can look like any of these:",
      tl: "Ang bullying ay hindi lang pananakit. Maaari itong maging alinman dito:",
      ceb: "Ang bullying dili lang pagpanakit. Mahimo kini nga bisan unsa niini:",
    },
    points: [
      {
        en: "Physical: hitting, pushing, kicking, or taking or breaking someone's things.",
        tl: "Pisikal: pananakit, pagtulak, pagsipa, o pagkuha at pagsira ng gamit ng iba.",
        ceb: "Pisikal: pagpanakit, pagduso, pagsipa, o pagkuha ug pagguba sa gamit sa uban.",
      },
      {
        en: "Verbal: name-calling, insults, mocking, or threats.",
        tl: "Pasalita: panlalait, pang-aasar, pangungutya, o pananakot.",
        ceb: "Pinulongan: pagtawag ug daotang ngalan, pag-insulto, pagbiaybiay, o paghulga.",
      },
      {
        en: "Social: leaving someone out on purpose, spreading rumors, or turning friends against them.",
        tl: "Sosyal: sadyang pagbubukod sa iba, pagkakalat ng tsismis, o pagpapaaway sa magkakaibigan.",
        ceb: "Sosyal: tinuyong pagsalikway sa uban, pagpakatap ug tsismis, o pagpaaway sa mga higala.",
      },
      {
        en: "Cyberbullying: mean messages, embarrassing photos, fake accounts, or being attacked in a group chat.",
        tl: "Cyberbullying: masasakit na mensahe, nakakahiyang litrato, pekeng account, o pag-atake sa group chat.",
        ceb: "Cyberbullying: sakit nga mga mensahe, makauulaw nga litrato, peke nga account, o gi-atake sa group chat.",
      },
      {
        en: "Emotional: shaming someone or making them feel scared, worthless, or alone.",
        tl: "Emosyonal: pagpapahiya o paggawa sa iba na makaramdam ng takot, walang halaga, o nag-iisa.",
        ceb: "Emosyonal: pagpakaulaw o paghimo sa uban nga mobati ug kahadlok, walay bili, o nag-inusara.",
      },
      {
        en: "Gender-based: teasing or targeting someone because of their gender, or unwanted sexual comments or touching.",
        tl: "Batay sa kasarian: pang-aasar o pag-target sa isang tao dahil sa kasarian niya, o hindi gustong sekswal na komento o paghawak.",
        ceb: "Pinasukad sa gender: pagsaway o pag-target sa usa ka tawo tungod sa iyang gender, o dili gusto nga sekswal nga komento o paghikap.",
      },
    ],
  },
  {
    id: "if-it-happens-to-you",
    icon: "heart-handshake",
    title: {
      en: "If it is happening to you",
      tl: "Kung nangyayari ito sa iyo",
      ceb: "Kung nahitabo kini kanimo",
    },
    intro: {
      en: "You are not alone, and it is never your fault. Here is what can help:",
      tl: "Hindi ka nag-iisa, at hindi mo ito kasalanan. Narito ang makakatulong:",
      ceb: "Dili ka nag-inusara, ug dili kini imong kasaypanan. Kini ang makatabang:",
    },
    points: [
      {
        en: "Tell someone you trust: a parent, teacher, adviser, or the Guidance Counselor. Keep telling until someone helps.",
        tl: "Magsabi sa taong pinagkakatiwalaan mo: magulang, guro, adviser, o ang Guidance Counselor. Ituloy ang pagsabi hanggang may tumulong.",
        ceb: "Pagsulti sa tawo nga gisaligan nimo: ginikanan, magtutudlo, adviser, o ang Guidance Counselor. Padayon sa pagsulti hangtod adunay motabang.",
      },
      {
        en: "Report it on Amoma. Your report is anonymous. Tap Bullying on the Home screen.",
        tl: "I-report ito sa Amoma. Anonymous ang iyong report. I-tap ang Bullying sa Home screen.",
        ceb: "I-report kini sa Amoma. Anonymous ang imong report. I-tap ang Bullying sa Home screen.",
      },
      {
        en: "Keep proof. Do not delete mean messages. Take screenshots, and write down what happened, when, and where.",
        tl: "Magtabi ng ebidensya. Huwag burahin ang masasakit na mensahe. Mag-screenshot, at isulat kung ano ang nangyari, kailan, at saan.",
        ceb: "Tipigi ang ebidensya. Ayaw papasa ang sakit nga mga mensahe. Pag-screenshot, ug isulat kung unsa ang nahitabo, kanus-a, ug asa.",
      },
      {
        en: "Do not fight back. Walk away to a safe place or to people who care about you.",
        tl: "Huwag gumanti. Lumayo papunta sa ligtas na lugar o sa mga taong may malasakit sa iyo.",
        ceb: "Ayaw panimalos. Palayo padulong sa luwas nga lugar o sa mga tawo nga nagpakabana kanimo.",
      },
      {
        en: "Stay near friends and adults, especially in places where bullying happens.",
        tl: "Manatili malapit sa mga kaibigan at adult, lalo na sa mga lugar kung saan nangyayari ang bullying.",
        ceb: "Pabilin duol sa mga higala ug adult, labi na sa mga lugar diin mahitabo ang bullying.",
      },
    ],
    reportCta: true,
  },
  {
    id: "if-you-see-it",
    icon: "users",
    title: {
      en: "If you see it happening",
      tl: "Kung nakita mo itong nangyayari",
      ceb: "Kung nakita nimo kini nga nahitabo",
    },
    intro: {
      en: "Bystanders matter. What you do can make it stop or make it worse.",
      tl: "Mahalaga ang mga nakakakita. Ang gagawin mo ay maaaring magpahinto o magpalala nito.",
      ceb: "Importante ang mga nakakita. Ang imong buhaton mahimong makapahunong o makapasamot niini.",
    },
    points: [
      {
        en: "Do not laugh, share, or join in. It encourages the bullying.",
        tl: "Huwag tumawa, mag-share, o sumali. Pinalalakas nito ang bullying.",
        ceb: "Ayaw katawa, mag-share, o moapil. Gipalig-on niini ang bullying.",
      },
      {
        en: "If it is safe, say something short like \"That's not funny. Stop.\" If it is not safe, get an adult right away.",
        tl: "Kung ligtas, magsabi ng maikli tulad ng \"Hindi nakakatawa 'yan. Itigil mo.\" Kung hindi ligtas, tumawag agad ng adult.",
        ceb: "Kung luwas, pagsulti ug mubo sama sa \"Dili kini kataw-anan. Undanga.\" Kung dili luwas, tawga dayon ang usa ka adult.",
      },
      {
        en: "Be kind to the person afterwards. Sit with them, invite them to join you, and let them know you care.",
        tl: "Maging mabait sa kanila pagkatapos. Samahan sila, anyayahan silang sumama sa iyo, at ipaalam na may pakialam ka.",
        ceb: "Pagmaayo kanila pagkahuman. Dumdumi sila, dapita sila nga moapil nimo, ug ipahibalo nga nagpakabana ka.",
      },
      {
        en: "Report it on Amoma. You can do it anonymously, and you may be the one who helps it stop.",
        tl: "I-report ito sa Amoma. Maaari kang mag-anonymous, at maaaring ikaw ang makatulong para matigil ito.",
        ceb: "I-report kini sa Amoma. Mahimo ka nga anonymous, ug mahimong ikaw ang makatabang aron mohunong kini.",
      },
    ],
    reportCta: true,
  },
  {
    id: "stay-safe-online",
    icon: "smartphone",
    title: {
      en: "Staying safe online",
      tl: "Pananatiling ligtas online",
      ceb: "Pagpabilin nga luwas online",
    },
    intro: {
      en: "Cyberbullying can follow you home. These steps protect you:",
      tl: "Maaaring sundan ka hanggang bahay ng cyberbullying. Ang mga hakbang na ito ang magpoprotekta sa iyo:",
      ceb: "Ang cyberbullying mahimong mosunod kanimo hangtod sa balay. Kini nga mga lakang mopanalipod kanimo:",
    },
    points: [
      {
        en: "Do not reply or get back at them. Replying usually makes it worse.",
        tl: "Huwag sumagot o gumanti. Kadalasan ay lumalala pa ito kapag sumagot ka.",
        ceb: "Ayaw tubag o panimalos. Kasagaran mosamot pa kini kung motubag ka.",
      },
      {
        en: "Take a screenshot first, then block the person and report them on the app or website.",
        tl: "Mag-screenshot muna, tapos i-block ang tao at i-report sila sa app o website.",
        ceb: "Pag-screenshot una, dayon i-block ang tawo ug i-report sila sa app o website.",
      },
      {
        en: "Keep your accounts private, and never share your passwords, even with friends.",
        tl: "Gawing private ang iyong mga account, at huwag ibigay ang password kahit sa mga kaibigan.",
        ceb: "Himoa nga private ang imong mga account, ug ayaw ihatag ang imong password bisan sa mga higala.",
      },
      {
        en: "Think before you post or forward. If it could hurt or embarrass someone, do not send it.",
        tl: "Mag-isip bago mag-post o mag-forward. Kung makakasakit o makakahiya ito sa iba, huwag ipadala.",
        ceb: "Panghunahuna una mag-post o mag-forward. Kung makasakit o makaulaw kini sa uban, ayaw ipadala.",
      },
      {
        en: "Never meet someone you only know online without telling an adult.",
        tl: "Huwag makipagkita sa taong online mo lang kilala nang hindi nagsasabi sa adult.",
        ceb: "Ayaw pakigkita sa tawo nga online ra nimo nailhan nga wala magsulti sa adult.",
      },
    ],
  },
  {
    id: "take-care-of-yourself",
    icon: "heart",
    title: {
      en: "Taking care of yourself",
      tl: "Pag-aalaga sa sarili",
      ceb: "Pag-amping sa imong kaugalingon",
    },
    intro: {
      en: "Being bullied can make you feel sad, angry, scared, or alone. Those feelings are normal, and you can get help.",
      tl: "Ang pagiging biktima ng bullying ay maaaring magdulot ng lungkot, galit, takot, o pag-iisa. Normal ang mga damdaming ito, at may makakatulong sa iyo.",
      ceb: "Ang pagka-biktima sa bullying mahimong makahatag ug kasubo, kasuko, kahadlok, o pag-inusara. Normal kini nga mga gibati, ug adunay makatabang kanimo.",
    },
    points: [
      {
        en: "Signs you may be affected: not wanting to go to school, trouble sleeping, stomachaches, lower grades, or no interest in things you used to enjoy.",
        tl: "Mga palatandaang apektado ka: ayaw nang pumasok, hirap matulog, sumasakit ang tiyan, bumababa ang grades, o wala nang gana sa mga dating kinasasabikan.",
        ceb: "Mga timailhan nga naapektuhan ka: dili na gusto moeskwela, lisod makatulog, sakit sa tiyan, nagkaubos ang grado, o wala nay gana sa mga butang nga kanunay nimong ganahan.",
      },
      {
        en: "Talk to a friend, a family member, or the Guidance Counselor. Asking for help is brave.",
        tl: "Makipag-usap sa kaibigan, kapamilya, o sa Guidance Counselor. Matapang ang humingi ng tulong.",
        ceb: "Pakig-istorya sa higala, sakop sa pamilya, o sa Guidance Counselor. Maisugon ang paghangyo ug tabang.",
      },
      {
        en: "Do something that calms you: draw, listen to music, play sports, or spend time with people who make you feel safe.",
        tl: "Gumawa ng bagay na nagpapakalma sa iyo: mag-drawing, makinig ng musika, mag-sports, o makasama ang mga taong nagpapaligtas sa pakiramdam mo.",
        ceb: "Buhata ang butang nga makapahupay kanimo: pag-drawing, pamati ug musika, pag-sports, o pakig-uban sa mga tawo nga makapabati nimo nga luwas.",
      },
      {
        en: "If you ever feel unsafe or think about hurting yourself, tell an adult right now. In an emergency, call 911.",
        tl: "Kung nakakaramdam ka ng panganib o iniisip mong saktan ang sarili, magsabi agad sa adult. Sa emergency, tumawag sa 911.",
        ceb: "Kung mobati ka nga dili luwas o naghunahuna nga sakiton ang imong kaugalingon, pagsulti dayon sa adult. Sa emergency, tawag sa 911.",
      },
    ],
  },
  {
    id: "your-rights",
    icon: "scale",
    title: {
      en: "Your rights and what happens after you report",
      tl: "Ang iyong mga karapatan at kung ano ang mangyayari pagkatapos mag-report",
      ceb: "Imong mga katungod ug unsa ang mahitabo human mag-report",
    },
    intro: {
      en: "You have the right to feel safe at school.",
      tl: "May karapatan kang makaramdam ng kaligtasan sa paaralan.",
      ceb: "Aduna kay katungod nga mobati nga luwas sa eskwelahan.",
    },
    points: [
      {
        en: "Philippine law (the Anti-Bullying Act of 2013) says schools must have an anti-bullying policy and must act on reports of bullying.",
        tl: "Ayon sa batas ng Pilipinas (Anti-Bullying Act of 2013), kailangang may anti-bullying policy ang mga paaralan at kumilos sa mga report ng bullying.",
        ceb: "Suno sa balaod sa Pilipinas (Anti-Bullying Act of 2013), kinahanglan adunay anti-bullying policy ang mga eskwelahan ug molihok sa mga report sa bullying.",
      },
      {
        en: "On Amoma your report is anonymous. The school can see what happened, not who you are.",
        tl: "Sa Amoma, anonymous ang iyong report. Nakikita ng paaralan kung ano ang nangyari, hindi kung sino ka.",
        ceb: "Sa Amoma, anonymous ang imong report. Makita sa eskwelahan unsa ang nahitabo, dili kung kinsa ka.",
      },
      {
        en: "After you report, your case goes through three steps: Case Assessment, Ongoing Action, and Case Resolved. You can follow its progress on your Home screen.",
        tl: "Pagkatapos mong mag-report, dadaan ang kaso sa tatlong hakbang: Case Assessment, Ongoing Action, at Case Resolved. Masusubaybayan mo ang progreso sa iyong Home screen.",
        ceb: "Human ka mag-report, moagi ang kaso sa tulo ka lakang: Case Assessment, Ongoing Action, ug Case Resolved. Mahimo nimong subaybayan ang progreso sa imong Home screen.",
      },
      {
        en: "If someone punishes you or gets back at you for reporting, tell an adult and report it again.",
        tl: "Kung may nanakit o gumanti sa iyo dahil nag-report ka, magsabi sa adult at i-report ito muli.",
        ceb: "Kung adunay nagsilot o nanimalos kanimo tungod sa imong pag-report, pagsulti sa adult ug i-report kini pag-usab.",
      },
    ],
    reportCta: true,
  },
];
