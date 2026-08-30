/**
 * Deterministic offline content used ONLY when ANTHROPIC_API_KEY is not configured,
 * so the app is still genuinely usable for a first look without any setup.
 *
 * This is intentionally smaller than a real IELTS test (1 passage / 1 section instead
 * of 3-4, ~10-13 questions instead of 40) — it is labelled SAMPLE in the UI rather than
 * pretending to be a full diagnostic. Once ANTHROPIC_API_KEY is set, every generation
 * call above switches to full-length Claude-authored tests automatically.
 */
import type { ReadingTest, ListeningTest, WritingTask1, WritingTask2, SpeakingQuestionSet } from "@/lib/ai/schemas";

export const FALLBACK_READING_TEST: ReadingTest = {
  title: "SAMPLE — The Rise of Urban Beekeeping",
  passages: [
    {
      index: 0,
      title: "The Rise of Urban Beekeeping",
      paragraphs: [
        {
          label: "A",
          text: "Over the past two decades, cities around the world have seen a quiet but steady increase in the number of residents keeping honeybee colonies on rooftops, balconies and in community gardens. What was once considered a purely rural pursuit has become a fixture of urban sustainability movements, with municipal governments from Paris to Toronto actively encouraging the practice through subsidised training programmes and relaxed zoning restrictions.",
        },
        {
          label: "B",
          text: "Proponents argue that urban beekeeping delivers ecological benefits that extend well beyond honey production. Bees kept in cities pollinate a wide variety of ornamental and food-bearing plants, potentially increasing yields in community gardens and private allotments. Because urban areas often contain a greater diversity of flowering plants across a smaller area than intensively farmed rural land, some researchers have suggested that city-kept bees may have access to a more varied and less pesticide-laden diet than their rural counterparts.",
        },
        {
          label: "C",
          text: "However, a growing number of entomologists have raised concerns that the popularity of urban beekeeping may be outpacing the available floral resources in many cities, leading to competition not only between managed honeybee colonies and wild native bee species, but between the honeybee colonies themselves. A study conducted in a major European capital found that in districts with a high density of registered hives, individual colonies produced significantly less honey per hive than colonies in less saturated areas, suggesting that the local environment could not support the number of bees being introduced.",
        },
        {
          label: "D",
          text: "This concern is compounded by the fact that honeybees, being generalist foragers with large colony sizes, can outcompete solitary native bee species for limited nectar and pollen. Native bees, many of which are already under pressure from habitat loss and pesticide use, may be particularly vulnerable in urban environments where floral resources are already constrained by dense building coverage. Some conservation biologists now argue that a well-intentioned effort to support pollinators through beekeeping may, paradoxically, be harming the very biodiversity it aims to protect.",
        },
        {
          label: "E",
          text: "In response to these findings, several cities have begun to reconsider how they regulate urban apiculture. Rather than simply capping the number of hives permitted per area, some municipal planners now advocate for a more holistic approach that pairs any increase in managed honeybee colonies with a corresponding increase in urban green space and flowering plant diversity. This would, in theory, expand the overall resource base rather than simply redistributing a fixed and already limited supply among more consumers.",
        },
        {
          label: "F",
          text: "For now, most urban beekeeping associations continue to promote the hobby, but a number have begun including guidance on hive density and encouraging members to plant pollinator-friendly gardens alongside their hives. Whether these voluntary measures will be sufficient to prevent the ecological costs identified by researchers remains an open question, and one that is likely to shape municipal beekeeping policy in the coming decade.",
        },
      ],
    },
    {
      index: 1,
      title: "SAMPLE PASSAGE 2 — reduced sample only",
      paragraphs: [{ label: "A", text: "This sample deliberately contains one full passage only. Configure ANTHROPIC_API_KEY to generate complete 3-passage / 40-question tests." }],
    },
    {
      index: 2,
      title: "SAMPLE PASSAGE 3 — reduced sample only",
      paragraphs: [{ label: "A", text: "This sample deliberately contains one full passage only. Configure ANTHROPIC_API_KEY to generate complete 3-passage / 40-question tests." }],
    },
  ],
  questions: [
    { number: 1, passageIndex: 0, groupType: "True/False/Not Given", groupInstructions: "Do the following statements agree with the information given in the passage? Write TRUE, FALSE, or NOT GIVEN.", prompt: "Municipal governments in some cities have discouraged residents from keeping bees.", correctAnswer: "FALSE" },
    { number: 2, passageIndex: 0, groupType: "True/False/Not Given", groupInstructions: "Do the following statements agree with the information given in the passage? Write TRUE, FALSE, or NOT GIVEN.", prompt: "City-kept bees may encounter fewer pesticides than bees on intensively farmed rural land.", correctAnswer: "TRUE" },
    { number: 3, passageIndex: 0, groupType: "True/False/Not Given", groupInstructions: "Do the following statements agree with the information given in the passage? Write TRUE, FALSE, or NOT GIVEN.", prompt: "All entomologists agree that urban beekeeping benefits native bee populations.", correctAnswer: "FALSE" },
    { number: 4, passageIndex: 0, groupType: "True/False/Not Given", groupInstructions: "Do the following statements agree with the information given in the passage? Write TRUE, FALSE, or NOT GIVEN.", prompt: "The European study measured honey production per hive across districts of different hive density.", correctAnswer: "TRUE" },
    { number: 5, passageIndex: 0, groupType: "True/False/Not Given", groupInstructions: "Do the following statements agree with the information given in the passage? Write TRUE, FALSE, or NOT GIVEN.", prompt: "Native solitary bees generally live in large colonies like honeybees.", correctAnswer: "FALSE" },
    { number: 6, passageIndex: 0, groupType: "Matching Information", groupInstructions: "Which paragraph contains the following information? Write the correct letter, A-F.", prompt: "A proposed policy solution that expands resources rather than just limiting hive numbers", correctAnswer: "E" },
    { number: 7, passageIndex: 0, groupType: "Matching Information", groupInstructions: "Which paragraph contains the following information? Write the correct letter, A-F.", prompt: "A description of how honeybees can be more successful foragers than native species", correctAnswer: "D" },
    { number: 8, passageIndex: 0, groupType: "Matching Information", groupInstructions: "Which paragraph contains the following information? Write the correct letter, A-F.", prompt: "An example of voluntary action already being taken by beekeeping groups", correctAnswer: "F" },
    { number: 9, passageIndex: 0, groupType: "Sentence Completion", groupInstructions: "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.", prompt: "Some cities have offered subsidised _____ programmes to encourage new beekeepers.", correctAnswer: "training" },
    { number: 10, passageIndex: 0, groupType: "Sentence Completion", groupInstructions: "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.", prompt: "Native bees are already affected by habitat loss and _____.", correctAnswer: "pesticide use" },
    { number: 11, passageIndex: 0, groupType: "Multiple Choice", groupInstructions: "Choose the correct letter, A, B, C or D.", prompt: "What does the writer suggest about the future of urban beekeeping policy?", options: ["It will remain unregulated indefinitely.", "It is likely to be shaped by whether voluntary measures prove sufficient.", "It will be banned in most major cities.", "It has already been fully resolved by planners."], correctAnswer: "It is likely to be shaped by whether voluntary measures prove sufficient." },
    { number: 12, passageIndex: 0, groupType: "Short Answer", groupInstructions: "Answer the question below using NO MORE THAN THREE WORDS from the passage.", prompt: "Besides honey production, what do proponents say bees provide to community gardens?", correctAnswer: "pollination" },
    { number: 13, passageIndex: 0, groupType: "Short Answer", groupInstructions: "Answer the question below using NO MORE THAN THREE WORDS from the passage.", prompt: "What kind of bee species may be outcompeted by honeybees in cities?", correctAnswer: "solitary native bees" },
  ],
};

export const FALLBACK_LISTENING_TEST: ListeningTest = {
  title: "SAMPLE — Community Centre Enquiry",
  sections: [
    {
      index: 0,
      title: "Section 1: Community Centre Membership Enquiry",
      context: "A phone conversation between a receptionist and a caller enquiring about membership.",
      script:
        "Receptionist: Good morning, Riverside Community Centre, how can I help you?\nCaller: Hi, I'm calling to ask about becoming a member. Could you tell me what's included?\nReceptionist: Of course. Our standard membership is forty-two pounds a month and includes the gym, the swimming pool, and two group classes per week.\nCaller: That sounds good. And is there a joining fee?\nReceptionist: There used to be, but we've actually waived it for anyone signing up this month, so no joining fee at the moment.\nCaller: Great. Can I ask, what are your opening hours on weekends?\nReceptionist: We're open from seven a.m. to eight p.m. on Saturdays, and nine a.m. to six p.m. on Sundays.\nCaller: Perfect. Could I book a tour before I sign up?\nReceptionist: Absolutely. Can I take your name, please?\nCaller: Yes, it's Daniel Whitfield. That's W-H-I-T-F-I-E-L-D.\nReceptionist: Thank you, Daniel. And a contact number?\nCaller: Zero seven nine two two, five five one, three three four.\nReceptionist: Got it. And finally, would Thursday at eleven a.m. suit you for the tour?\nCaller: Thursday at eleven works well for me.\nReceptionist: Wonderful, I'll pencil you in. We'll see you then.",
      speakerVoices: [
        { speaker: "Receptionist", voiceHint: "female" },
        { speaker: "Caller", voiceHint: "male" },
      ],
    },
    { index: 1, title: "SAMPLE — reduced sample only", context: "This sample deliberately contains one full section only.", script: "Configure ANTHROPIC_API_KEY to generate complete 4-section / 40-question tests.", speakerVoices: [{ speaker: "Narrator", voiceHint: "female" }] },
    { index: 2, title: "SAMPLE — reduced sample only", context: "This sample deliberately contains one full section only.", script: "Configure ANTHROPIC_API_KEY to generate complete 4-section / 40-question tests.", speakerVoices: [{ speaker: "Narrator", voiceHint: "female" }] },
    { index: 3, title: "SAMPLE — reduced sample only", context: "This sample deliberately contains one full section only.", script: "Configure ANTHROPIC_API_KEY to generate complete 4-section / 40-question tests.", speakerVoices: [{ speaker: "Narrator", voiceHint: "male" }] },
  ],
  questions: [
    { number: 1, sectionIndex: 0, groupType: "Form Completion", groupInstructions: "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.", prompt: "Monthly membership cost: £_____", correctAnswer: "42" },
    { number: 2, sectionIndex: 0, groupType: "Form Completion", groupInstructions: "Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.", prompt: "Number of group classes per week included: _____", correctAnswer: "2" },
    { number: 3, sectionIndex: 0, groupType: "Short Answer", groupInstructions: "Answer the questions below.", prompt: "Is there currently a joining fee?", correctAnswer: "no" },
    { number: 4, sectionIndex: 0, groupType: "Form Completion", groupInstructions: "Complete the form below.", prompt: "Saturday opening time: _____ a.m.", correctAnswer: "7" },
    { number: 5, sectionIndex: 0, groupType: "Form Completion", groupInstructions: "Complete the form below.", prompt: "Sunday closing time: _____ p.m.", correctAnswer: "6" },
    { number: 6, sectionIndex: 0, groupType: "Form Completion", groupInstructions: "Complete the form below.", prompt: "Caller's surname: _____", correctAnswer: "Whitfield" },
    { number: 7, sectionIndex: 0, groupType: "Form Completion", groupInstructions: "Complete the form below.", prompt: "Contact number: _____", correctAnswer: "07922551334" },
    { number: 8, sectionIndex: 0, groupType: "Short Answer", groupInstructions: "Answer the question below.", prompt: "What day is the tour booked for?", correctAnswer: "Thursday" },
    { number: 9, sectionIndex: 0, groupType: "Short Answer", groupInstructions: "Answer the question below.", prompt: "What time is the tour booked for?", correctAnswer: "11 a.m." },
    { number: 10, sectionIndex: 0, groupType: "Multiple Choice", groupInstructions: "Choose the correct letter, A, B or C.", prompt: "What does standard membership NOT include?", options: ["the gym", "the swimming pool", "personal training sessions"], correctAnswer: "personal training sessions" },
  ],
};

export const FALLBACK_WRITING_TASK1: WritingTask1 = {
  visualType: "bar",
  prompt:
    "SAMPLE TASK — The bar chart below shows the percentage of households with internet access in four countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
  chartTitle: "Household Internet Access (%) by Country, 2000-2020",
  chartSeries: ["2000", "2010", "2020"],
  chartData: [
    { label: "Norway", "2000": 25, "2010": 78, "2020": 97 },
    { label: "Brazil", "2000": 3, "2010": 34, "2020": 74 },
    { label: "India", "2000": 1, "2010": 8, "2020": 45 },
    { label: "South Korea", "2000": 30, "2010": 90, "2020": 99 },
  ],
};

export const FALLBACK_WRITING_TASK2: WritingTask2 = {
  questionType: "opinion",
  prompt:
    "SAMPLE TASK — Some people believe that university students should be required to attend classes in person, while others think they should be free to choose between online and in-person learning. Discuss both views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
};

export const FALLBACK_SPEAKING_QUESTIONS: SpeakingQuestionSet = {
  part1: {
    topic: "Hometown",
    questions: [
      "Where is your hometown?",
      "What do you like most about your hometown?",
      "Has your hometown changed much in recent years?",
      "Would you like to continue living there in the future?",
    ],
  },
  part2: {
    cueCardTopic: "A skill you would like to learn",
    prompt: "Describe a skill you would like to learn. You should say:",
    bulletPoints: [
      "what the skill is",
      "why you want to learn it",
      "how you would learn it",
      "and explain how this skill could be useful to you in the future",
    ],
  },
  part3: {
    questions: [
      "Do you think it's more important to learn practical skills or academic knowledge at school?",
      "How has technology changed the way people learn new skills?",
      "Should adults continue learning new skills throughout their lives? Why?",
      "Are some skills becoming less important because of automation?",
    ],
  },
};
