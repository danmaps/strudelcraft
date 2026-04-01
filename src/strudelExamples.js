export const IMPORT_EXAMPLES = [
    {
        key: 'rock-basic',
        label: '1. Basic Rock Beat',
        code: '$: s("bd hh hh hh sd hh hh hh bd hh hh hh sd hh hh oh")',
        status: 'Loaded a basic rock beat example into the import box. Click Import to map it into the grid.',
    },
    {
        key: 'single-phrase',
        label: '2. Single Phrase',
        code: '$: s("bd [hh hh] sd hh bd hh [sd hh] hh")',
        status: 'Loaded a single-phrase drum example with multiple instruments living in one line.',
    },
    {
        key: 'staggered-clusters',
        label: '3. Staggered Clusters',
        code: '$: s("bd hh sd [hh hh] bd [sd hh] hh oh")',
        status: 'Loaded a clustered one-line example with bracketed subdivisions.',
    },
    {
        key: 'stacked-accents',
        label: '4. Stacked Accents',
        code: '$: s("[bd hh] hh sd hh [bd sd] hh oh hh")',
        status: 'Loaded a stacked-hit example that starts stressing same-step combinations.',
    },
    {
        key: 'ratchet-pulse',
        label: '5. Ratchet Pulse',
        code: '$: s("bd*2 hh sd hh [bd hh sd] oh")',
        status: 'Loaded a repeated-hit example that begins to show where the 16-step grid flattens detail.',
    },
    {
        key: 'dense-break',
        label: '6. Dense Break',
        code: '$: s("[bd hh sd] [hh hh] bd [sd hh bd] oh")',
        status: 'Loaded a dense composite phrase that pushes beyond neat one-lane-per-instrument thinking.',
    },
];

export const PUNCHCARD_EXAMPLES = [
    {
        key: 'punchcard-polyrhythm',
        label: 'Punchcard Polyrhythm',
        code: `setcps(0.9)
$: s("bd [hh hh] sd hh bd hh [sd hh] oh")
    .sometimes(rev)`,
        status: 'Loaded a polyrhythmic drum phrase for the punchcard.',
    },
    ...IMPORT_EXAMPLES,
];
