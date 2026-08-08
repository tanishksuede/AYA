const fs = require('fs');

const scenariosPath = 'src/data/scenarios.ts';
const levelsPath = 'src/utils/levelGenerator.ts';

let scenarios = fs.readFileSync(scenariosPath, 'utf8');
let levels = fs.readFileSync(levelsPath, 'utf8');

const sheeranScenarios = `
    // AGE 21: Ed Sheeran - Part 1
    'lvl_age_21_sheeran_1': {
        title: "The Photo She Might See",
        source: "Source: Interview on 16 February 2012",
        frames: [
            {
                id: 'intro',
                emotion: 'grief',
                bg: '/assets/bg-ed-sheeran-london-2012.png',
                portrait: '/assets/portrait-ed-sheeran.png',
                text: "You are 21. Your career is moving faster than you expected. People recognize you now. Photographers are following you. Fans are watching.\\n\\nBut underneath all of that, something much more personal has recently ended. You have just come through a difficult breakup after a four-year relationship. You have barely spoken to your former girlfriend since it ended.\\n\\nThen a photograph appears of you with another girl. To everyone else, it may be just another celebrity photograph. To you, it carries a different weight. You know the person who matters may see it. You cannot control what the photograph means to someone else.\\n\\nAnd you have a difficult choice: Do you explain yourself? Do you stay silent? Or do you simply accept that the relationship is over and continue forward?",
                choices: [
                    {
                        text: "REACH OUT: Try to explain the situation rather than allowing a photograph to tell the entire story.",
                        next: 'reveal',
                        score: 10,
                        feedbackTitle: "Connection",
                        feedback: "You find unresolved relationships difficult to leave without explanation. You value emotional clarity, even when reopening a conversation may hurt."
                    },
                    {
                        text: "SAY NOTHING: Accept that the relationship has ended and avoid creating another emotional confrontation.",
                        next: 'reveal',
                        score: 10,
                        feedbackTitle: "Acceptance",
                        feedback: "You believe some endings become harder when you keep trying to control how the other person understands them."
                    },
                    {
                        text: "KEEP MOVING: Focus on work, friends and the life that is beginning to change around you. Do not chase closure.",
                        next: 'reveal',
                        score: 10,
                        feedbackTitle: "Forward Motion",
                        feedback: "You cope with emotional pain by continuing to build the next chapter rather than remaining inside the previous one."
                    }
                ]
            },
            {
                id: 'reveal',
                emotion: 'grief',
                bg: '/assets/bg-ed-sheeran-london-2012.png',
                portrait: '/assets/portrait-ed-sheeran.png',
                text: "HISTORICAL REALITY:\\nIn an interview published on 16 February 2012, immediately before Sheeran's 21st birthday, he discussed a difficult breakup after four years. He said he had not really spoken to his former girlfriend since the breakup and was concerned about her seeing paparazzi photographs of him with another girl.\\n\\nThe historical record does NOT establish that he chose any of the three hypothetical approaches above. Therefore, there is no \\"correct\\" answer. The important historical fact is that Sheeran was entering age 21 while dealing with the aftermath of a significant relationship ending at the same time that his public profile was rapidly increasing.\\n\\nLESSON:\\nSometimes personal loss does not wait for a convenient moment. A career can be accelerating while another part of your life is falling apart. The difficult part is not always choosing between success and failure. Sometimes it is learning how to carry personal pain while the rest of your life keeps moving.",
                choices: [
                    {
                        text: "Complete Level",
                        next: 'COMPLETE',
                        score: 0,
                        feedbackTitle: "",
                        feedback: ""
                    }
                ]
            }
        ]
    },
    // AGE 21: Ed Sheeran - Part 2
    'lvl_age_21_sheeran_2': {
        title: "The People That Still Feel Like Home",
        source: "Source: August 2012 Interview",
        frames: [
            {
                id: 'intro',
                emotion: 'calm',
                bg: '/assets/bg-ed-sheeran-london-2012.png',
                portrait: '/assets/portrait-ed-sheeran.png',
                text: "You are 21. Your calendar is filling up. There are performances. Travel. Writing. People asking for your time. More opportunities than before.\\n\\nBut there is another question underneath all of it. What happens to the people who knew you before all of this?\\n\\nYour friends still want to see you. Your family still wants you around. And your career keeps giving you reasons to leave again.\\n\\nYou have to decide what \\"success\\" is allowed to cost you. You cannot give everyone unlimited time. But you also cannot assume the people closest to you will always be there whenever you return.\\n\\nWhat do you prioritize?",
                choices: [
                    {
                        text: "GIVE THE CAREER EVERYTHING: Accept that this period of your life is temporary and give your work almost all of your attention.",
                        next: 'reveal',
                        score: 10,
                        feedbackTitle: "Ambition",
                        feedback: "You are willing to accept personal sacrifice when you believe an opportunity may not come twice."
                    },
                    {
                        text: "PROTECT TIME FOR YOUR PEOPLE: Keep meaningful time for friends and family even if it means turning down or limiting some opportunities.",
                        next: 'reveal',
                        score: 10,
                        feedbackTitle: "Connection",
                        feedback: "You believe success has less value if you become disconnected from the people who matter to you."
                    },
                    {
                        text: "BUILD A BALANCE: Keep pursuing the opportunities, but deliberately protect relationships and personal time instead of treating them as whatever remains after work.",
                        next: 'reveal',
                        score: 10,
                        feedbackTitle: "Balance",
                        feedback: "You try to build success without allowing it to consume the rest of your life."
                    }
                ]
            },
            {
                id: 'reveal',
                emotion: 'calm',
                bg: '/assets/bg-ed-sheeran-london-2012.png',
                portrait: '/assets/portrait-ed-sheeran.png',
                text: "HISTORICAL REALITY:\\nIn an August 2012 interview, Sheeran spoke about the sacrifices involved in the life he was living. He described friends and family as central to what mattered to him and connected happiness with maintaining a good balance between those relationships and his work.\\n\\nThe historical record does NOT establish that he literally faced these exact three choices on a specific day. Instead, they represent a real tension in his life at that time.\\n\\nLESSON:\\nSuccess changes your schedule before it changes your identity. The people who knew you before success can become even more important once everyone else starts wanting something from you.\\n\\nAmbition asks: \\"What can I achieve?\\"\\nBalance asks: \\"Who do I want beside me when I get there?\\"",
                choices: [
                    {
                        text: "Complete Level",
                        next: 'COMPLETE',
                        score: 0,
                        feedbackTitle: "",
                        feedback: ""
                    }
                ]
            }
        ]
    },
`;

if (!scenarios.includes('lvl_age_21_sheeran_1')) {
    scenarios = scenarios.replace(/};\s*$/, sheeranScenarios + '};\n');
    fs.writeFileSync(scenariosPath, scenarios);
    console.log("Updated scenarios.ts");
} else {
    console.log("Ed Sheeran scenarios already exist.");
}

const sheeranLevels = `
        {
            id: 'lvl_21_sheeran_1', title: 'The Photo She Might See', description: 'At 21, you must choose how to handle the painful intersection of a recent breakup and sudden public attention.',
            requiredStars: 0, year: 2012, age: 21, theme: 'Music', archetype: 'The Artist', personality: 'Ed Sheeran',
            bio: 'A 21-year-old musician dealing with a breakup while his career takes off.',
            fame: 'Grammy-winning Singer-Songwriter',
            achievements: ['One of the best-selling music artists of all time'],
            lesson: 'Sometimes it is learning how to carry personal pain while the rest of your life keeps moving.',
            avatarUrl: '/assets/portrait-ed-sheeran.png', scenarioId: 'lvl_age_21_sheeran_1',
            idolTraits: { discipline: 85, resilience: 90, risk: 80, leadership: 70, creativity: 100, empathy: 95, vision: 85 }
        },
        {
            id: 'lvl_21_sheeran_2', title: 'The People That Still Feel Like Home', description: 'At 21, you must decide what success is allowed to cost you in your personal life.',
            requiredStars: 0, year: 2012, age: 21, theme: 'Music', archetype: 'The Artist', personality: 'Ed Sheeran',
            bio: 'A 21-year-old musician dealing with a breakup while his career takes off.',
            fame: 'Grammy-winning Singer-Songwriter',
            achievements: ['One of the best-selling music artists of all time'],
            lesson: 'Success changes your schedule before it changes your identity.',
            avatarUrl: '/assets/portrait-ed-sheeran.png', scenarioId: 'lvl_age_21_sheeran_2',
            idolTraits: { discipline: 85, resilience: 90, risk: 80, leadership: 70, creativity: 100, empathy: 95, vision: 85 }
        },`;

if (!levels.includes('lvl_21_sheeran_1')) {
    const targetString = "// Age 21: Shah Rukh Khan";
    levels = levels.replace(targetString, sheeranLevels + "\\n\\n        " + targetString);
    fs.writeFileSync(levelsPath, levels);
    console.log("Updated levelGenerator.ts");
} else {
    console.log("Ed Sheeran levels already exist.");
}
