/**
 * @jest-environment jsdom
 */

import WorldEnvironment from '../src/Environments/WorldEnvironment';
import Organism from '../src/Organism/Organism';
import FossilRecord from '../src/Stats/FossilRecord';
import Species from '../src/Stats/Species';

declare const globalThis: { $: () => any };

describe('fossil record tests', () => {
    /* the environment needs a dom environment with a canvas */

    const canvas = document.createElement('canvas');
    canvas.id = 'env-canvas';
    document.body.appendChild(canvas);

    /* the environment uses jquery for some unknown reason */
    /* jquery noop object to prevent errors */

    globalThis.$ = () => {
        return {
            height() {},
            width() {},
        };
    };

    const env = new WorldEnvironment(5);
    const fossilRecord = new FossilRecord(env);

    test('init', () => {
        expect(fossilRecord.extant_species).toStrictEqual({});
        expect(fossilRecord.extinct_species).toStrictEqual({});
    });

    const addSpecies = (): Species => {
        const org = new Organism(0, 0, fossilRecord.env, null);
        return fossilRecord.addSpecies(org, null);
    };

    test('add species', () => {
        const speciesReturn = addSpecies();

        const species = Object.values(fossilRecord.extant_species)[0];

        expect(speciesReturn).toBe(species);
        expect(species).toBeInstanceOf(Species);
    });

    test('duplicate add species', () => {
        const species = Object.values(fossilRecord.extant_species)[0];
        expect(species).toBeInstanceOf(Species);

        console.warn = jest.fn();

        fossilRecord.addSpeciesObj(species);

        expect(console.warn).toHaveBeenCalledWith(
            'Tried to add already existing species. Add failed.',
        );
    });

    test('fossilize non existing species', () => {
        const org = new Organism(0, 0, fossilRecord.env, null);
        const species = new Species(org.anatomy, null, 0);

        console.warn = jest.fn();

        expect(fossilRecord.fossilize(species)).toBe(false);

        expect(console.warn).toHaveBeenCalledWith(
            'Tried to fossilize non existing species.',
        );
    });

    test('fossilize added species (no store)', () => {
        const species = Object.values(
            fossilRecord.extant_species,
        )[0] as Species;
        expect(species).toBeInstanceOf(Species);

        expect(fossilRecord.numExtantSpecies()).toBe(1);

        expect(fossilRecord.fossilize(species)).toBe(false);

        expect(fossilRecord.numExtantSpecies()).toBe(0);
        expect(species.ancestor).toBe(undefined);
    });

    test('fossilize added species (store)', () => {
        const speciesReturn = addSpecies();

        for (let i = 0; i < 9; ++i) {
            speciesReturn.addPop();
        }

        expect(fossilRecord.fossilize(speciesReturn)).toBe(true);
        expect(fossilRecord.numExtantSpecies()).toBe(0);
    });

    test('clear record', () => {
        fossilRecord.clear_record();

        expect(fossilRecord.extant_species).toStrictEqual({});
        expect(fossilRecord.extinct_species).toStrictEqual({});
    });
});
