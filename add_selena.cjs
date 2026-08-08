const fs = require('fs');

const scenariosFile = 'src/data/scenarios.ts';
const generatorFile = 'src/utils/levelGenerator.ts';

// 1. Append to scenarios.ts
let scenariosContent = fs.readFileSync(scenariosFile, 'utf8');

const selenaScenarios = `
    // AGE 21: Selena Gomez - Part 1
    'lvl_age_21_selena_1': {
        title: "When Everyone Has an Opinion",
        source: "Source: Historical Context, 2013-2014",
        frames: [
            {
                id: 'intro',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'love',
                text: "Year: 2013. You are 21. You are old enough to know that your personal life belongs to you. But the world does not always treat it that way. Your relationship has become part of public conversation. Every appearance can become a headline. Every photograph can be interpreted. Every time you are seen together, people decide what it means.",
                choices: [
                    {
                        text: "A) PROTECT THE RELATIONSHIP: Keep personal matters as private as possible. Do not allow public opinion to determine what happens between two people.",
                        next: 'protect',
                        score: 0,
                        feedbackTitle: "Privacy",
                        feedback: "You believe important relationships should be protected from outside judgment."
                    },
                    {
                        text: "B) STEP BACK: Create emotional distance and give yourself room to figure out what you actually want.",
                        next: 'step_back',
                        score: 0,
                        feedbackTitle: "Self-Preservation",
                        feedback: "You prioritize understanding yourself before trying to satisfy someone else's expectations."
                    },
                    {
                        text: "C) KEEP TRYING: Accept that relationships can be complicated and continue trying to make the situation work despite the public attention.",
                        next: 'keep_trying',
                        score: 0,
                        feedbackTitle: "Commitment",
                        feedback: "You are willing to tolerate uncertainty when a relationship still matters to you."
                    }
                ]
            },
            {
                id: 'protect',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'love',
                text: "HISTORICAL REALITY:\\nDuring 2013, Selena Gomez and Justin Bieber's relationship remained a major subject of public attention. Their relationship had already gone through periods of separation and reconciliation, and media coverage continued to follow their interactions.\\n\\nThe historical record does NOT establish that Selena faced the exact three choices above.\\n\\nAt 21, Selena was navigating a period in which her personal relationship was being discussed publicly while she was simultaneously trying to establish her own adult identity. The important historical context is not whether she made one perfect relationship decision. It is that her private life had become difficult to separate from her public identity.\\n\\nLESSON:\\nA relationship becomes harder to understand when everyone outside it has an opinion. Sometimes growing up means learning the difference between: \\\"What do I actually want?\\\" and \\\"What does everyone expect me to want?\\\"",
                choices: []
            },
            {
                id: 'step_back',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'love',
                text: "HISTORICAL REALITY:\\nDuring 2013, Selena Gomez and Justin Bieber's relationship remained a major subject of public attention. Their relationship had already gone through periods of separation and reconciliation, and media coverage continued to follow their interactions.\\n\\nThe historical record does NOT establish that Selena faced the exact three choices above.\\n\\nAt 21, Selena was navigating a period in which her personal relationship was being discussed publicly while she was simultaneously trying to establish her own adult identity. The important historical context is not whether she made one perfect relationship decision. It is that her private life had become difficult to separate from her public identity.\\n\\nLESSON:\\nA relationship becomes harder to understand when everyone outside it has an opinion. Sometimes growing up means learning the difference between: \\\"What do I actually want?\\\" and \\\"What does everyone expect me to want?\\\"",
                choices: []
            },
            {
                id: 'keep_trying',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'love',
                text: "HISTORICAL REALITY:\\nDuring 2013, Selena Gomez and Justin Bieber's relationship remained a major subject of public attention. Their relationship had already gone through periods of separation and reconciliation, and media coverage continued to follow their interactions.\\n\\nThe historical record does NOT establish that Selena faced the exact three choices above.\\n\\nAt 21, Selena was navigating a period in which her personal relationship was being discussed publicly while she was simultaneously trying to establish her own adult identity. The important historical context is not whether she made one perfect relationship decision. It is that her private life had become difficult to separate from her public identity.\\n\\nLESSON:\\nA relationship becomes harder to understand when everyone outside it has an opinion. Sometimes growing up means learning the difference between: \\\"What do I actually want?\\\" and \\\"What does everyone expect me to want?\\\"",
                choices: []
            }
        ]
    },

    // AGE 21: Selena Gomez - Part 2
    'lvl_age_21_selena_2': {
        title: "Your Own Name",
        source: "Source: Historical Context, 2013-2014",
        frames: [
            {
                id: 'intro',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'determination',
                text: "People have known you for years. They have watched you grow up. They have opinions about what you should wear. What you should sing. Who you should date. What kind of person you should become. But you are changing. You are releasing your own music. You are moving into a more mature phase of your career. You have an opportunity to define yourself rather than simply continue the identity people already know. The question is: \\\"How much of the person people know is actually the person I want to become?\\\"",
                choices: [
                    {
                        text: "A) PLAY IT SAFE: Stay close to the image people already know. Make gradual changes rather than risking a strong reaction.",
                        next: 'play_safe',
                        score: 0,
                        feedbackTitle: "Security",
                        feedback: "You prefer controlled evolution over dramatic change."
                    },
                    {
                        text: "B) DEFINE YOURSELF: Use your music and creative choices to establish a more independent adult identity. Accept that some people may not immediately understand the change.",
                        next: 'define_yourself',
                        score: 0,
                        feedbackTitle: "Identity",
                        feedback: "You value becoming the person you choose to be over preserving everyone's existing expectations."
                    },
                    {
                        text: "C) CHANGE EVERYTHING: Take the opportunity to completely separate yourself from the version of you that people already know. Use this period as a complete reinvention.",
                        next: 'change_everything',
                        score: 0,
                        feedbackTitle: "Reinvention",
                        feedback: "You are willing to accept uncertainty and criticism if it gives you greater control over your identity."
                    }
                ]
            },
            {
                id: 'play_safe',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'determination',
                text: "HISTORICAL REALITY:\\nIn 2013, Selena Gomez released Stars Dance. The album debuted at number one on the Billboard 200, becoming her first number-one album. She subsequently embarked on the Stars Dance Tour, her first solo world tour.\\n\\nThis period represented an important step toward establishing Selena as an independent recording artist rather than only the young performer audiences had known from her earlier career.\\n\\nThe historical record does NOT establish that she faced the exact three choices above.\\n\\nLESSON:\\nGrowing up publicly is different from growing up privately. You may change before everyone else is ready to accept the change. The people who knew an earlier version of you may not immediately understand the person you are becoming. You do not need to remain the same person simply because other people became comfortable with who you used to be.",
                choices: []
            },
            {
                id: 'define_yourself',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'determination',
                text: "HISTORICAL REALITY:\\nIn 2013, Selena Gomez released Stars Dance. The album debuted at number one on the Billboard 200, becoming her first number-one album. She subsequently embarked on the Stars Dance Tour, her first solo world tour.\\n\\nThis period represented an important step toward establishing Selena as an independent recording artist rather than only the young performer audiences had known from her earlier career.\\n\\nThe historical record does NOT establish that she faced the exact three choices above.\\n\\nLESSON:\\nGrowing up publicly is different from growing up privately. You may change before everyone else is ready to accept the change. The people who knew an earlier version of you may not immediately understand the person you are becoming. You do not need to remain the same person simply because other people became comfortable with who you used to be.",
                choices: []
            },
            {
                id: 'change_everything',
                bg: '/assets/bg-selena-gomez-los-angeles-2013.png',
                portrait: '/assets/avatar_selena.jpg?v=2',
                emotion: 'determination',
                text: "HISTORICAL REALITY:\\nIn 2013, Selena Gomez released Stars Dance. The album debuted at number one on the Billboard 200, becoming her first number-one album. She subsequently embarked on the Stars Dance Tour, her first solo world tour.\\n\\nThis period represented an important step toward establishing Selena as an independent recording artist rather than only the young performer audiences had known from her earlier career.\\n\\nThe historical record does NOT establish that she faced the exact three choices above.\\n\\nLESSON:\\nGrowing up publicly is different from growing up privately. You may change before everyone else is ready to accept the change. The people who knew an earlier version of you may not immediately understand the person you are becoming. You do not need to remain the same person simply because other people became comfortable with who you used to be.",
                choices: []
            }
        ]
    }
`;

scenariosContent = scenariosContent.replace(/};\s*$/, '},\n' + selenaScenarios + '\n};\n');
fs.writeFileSync(scenariosFile, scenariosContent);
console.log('Appended to scenarios.ts');

// 2. Append to levelGenerator.ts
let generatorContent = fs.readFileSync(generatorFile, 'utf8');

const selenaLevels = `
        {
            id: 'lvl_21_selena_1', title: 'When Everyone Has an Opinion', description: 'At 21, you must choose how to handle the painful intersection of a recent relationship and sudden public attention.',
            requiredStars: 0, year: 2013, age: 21, theme: 'Music', archetype: 'The Vulnerable', personality: 'Selena Gomez',
            bio: 'A 21-year-old musician trying to understand what she wants from a relationship while everyone else tries to decide for her.',
            fame: 'Global pop star transitioning to a mature era',
            achievements: ['First Billboard 200 number-one album with Stars Dance'],
            lesson: 'A relationship becomes harder to understand when everyone outside it has an opinion.',
            avatarUrl: '/assets/avatar_selena.jpg?v=2', scenarioId: 'lvl_age_21_selena_1',
            idolTraits: { discipline: 85, resilience: 90, risk: 80, leadership: 70, creativity: 100, empathy: 95, vision: 85 }
        },
        {
            id: 'lvl_21_selena_2', title: 'Your Own Name', description: 'At 21, you must decide how much of the person people know is actually the person you want to become.',
            requiredStars: 0, year: 2013, age: 21, theme: 'Music', archetype: 'The Vulnerable', personality: 'Selena Gomez',
            bio: 'A 21-year-old establishing her independent creative identity while the world watches her grow up.',
            fame: 'Global pop star transitioning to a mature era',
            achievements: ['First Billboard 200 number-one album with Stars Dance'],
            lesson: 'You do not need to remain the same person simply because other people became comfortable with who you used to be.',
            avatarUrl: '/assets/avatar_selena.jpg?v=2', scenarioId: 'lvl_age_21_selena_2',
            idolTraits: { discipline: 85, resilience: 90, risk: 80, leadership: 70, creativity: 100, empathy: 95, vision: 85 }
        },
`;

generatorContent = generatorContent.replace(/(\/\/ Age 21: Shah Rukh Khan)/, selenaLevels + '\n        $1');
fs.writeFileSync(generatorFile, generatorContent);
console.log('Appended to levelGenerator.ts');
