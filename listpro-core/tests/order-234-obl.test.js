'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { compileFunction } = require('node:vm');
const { pieces } = require('../benchmarks/order-234-target14/input.json');
const layout = require('../benchmarks/order-234-target14/result.json');
const { sheets } = layout;

const folder = path.join(__dirname, '../benchmarks/order-234-target14/bazis-import');
const html = readFileSync(path.join(folder, 'razdelit-obl.html'), 'utf8');
const core = html.match(/<script id="obl-core">([\s\S]+?)<\/script>/)[1];
const { nativeOblOrder, verifyOblFiles, zipStore, planFromLayout } =
  compileFunction(core + '\nreturn { nativeOblOrder, verifyOblFiles, zipStore, planFromLayout };')();
const plan = planFromLayout(layout);

function decode(encoding, bytes, fatal = false) {
  return new TextDecoder(encoding, { fatal, ignoreBOM: true }).decode(bytes);
}

const alphabet = decode('windows-1251', Uint8Array.from({ length: 256 }, (_, index) => index));
function encode1251(text) {
  return Uint8Array.from(text, c => {
    const byte = alphabet.indexOf(c);
    assert.notEqual(byte, -1, c);
    return byte;
  });
}

const material = 'Material\tПроверочная плита\tSlab\t\t16\t';
const prefix = 'List_of_panels_for_cutting\tVersion 10.0\tТекущий материал\tПроверочная плита\r\n' + material;
function partRow([id, w, h, qty], note = '') {
  const mm = n => String(n).replace('.', ',');
  const edge = ['Тестовая кромка', '1*19', 1], empty = ['', '', 0];
  return [id, mm(w), mm(h), qty, 'Не задана', 'Панель ' + id + note, 1,
    ...edge, ...empty, ...(id % 2 ? empty : edge), ...empty, '5x8',
    '', 'Модель', '', 3, '', 0, '', 0, 0, 0, '', ''].join('\t');
}
const sourceRows = plan.job.map(part => partRow(part));
const source = [prefix, ...sourceRows].join('\r\n');

function readStoredZip(input) {
  const bytes = Buffer.from(input), entries = new Map();
  const end = bytes.length - 22;
  assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  let cursor = bytes.readUInt32LE(end + 16);
  const count = bytes.readUInt16LE(end + 10);
  for (let index = 0; index < count; index++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50);
    assert.equal(bytes.readUInt16LE(cursor + 10), 0);
    const offset = bytes.readUInt32LE(cursor + 42);
    assert.equal(bytes.readUInt32LE(offset), 0x04034b50);
    const length = bytes.readUInt32LE(cursor + 24);
    assert.equal(bytes.readUInt32LE(offset + 22), length);
    const nameSize = bytes.readUInt16LE(cursor + 28);
    const name = bytes.toString('ascii', cursor + 46, cursor + 46 + nameSize);
    const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    assert.ok(!entries.has(name), name);
    entries.set(name, bytes.subarray(start, start + length));
    cursor += 46 + nameSize + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32);
  }
  assert.equal(cursor, end);
  return entries;
}

test('OBL assignment covers exactly the original instances of the verified 14-sheet result', () => {
  assert.deepEqual(plan.job, pieces.map(({ id, l, w, q }) => [id, l, w, q]));
  assert.deepEqual(plan.instances, sheets.map(s => s.parts.map(p => [p.id, p.instance])));
  const bad = structuredClone(layout);
  bad.sheets[0].parts[0].instance = bad.sheets[0].parts[1].instance;
  assert.throws(() => planFromLayout(bad), /экземпляра/);
});

test('CP1251 source fields are copied byte for byte except for per-sheet quantities', () => {
  const out = nativeOblOrder(encode1251(source), plan, decode);
  assert.equal(out.charset, 'windows-1251');
  assert.deepEqual(verifyOblFiles(out, plan, decode), { files: 14, instances: 234, positions: 75, area: 65644689 });
  const zip = readStoredZip(zipStore(out.sheets));
  assert.equal(zip.size, 14);
  sheets.forEach((s, k) => {
    const demand = new Map();
    for (const part of s.parts) demand.set(part.id, (demand.get(part.id) || 0) + 1);
    const expected = plan.job.filter(([id]) => demand.has(id))
      .map(([id, w, h]) => partRow([id, w, h, demand.get(id)]));
    const lastInputRow = plan.job.at(-1)[0];
    const eol = demand.has(lastInputRow) ? '' : '\r\n';
    const name = 'List-' + String(k + 1).padStart(2, '0') + '.obl';
    assert.deepEqual(zip.get(name), Buffer.from(encode1251([prefix, ...expected].join('\r\n') + eol)), name);
  });
  assert.equal(out.sheets[1].positions, 6);
  assert.equal(out.sheets[1].units, 13);
});

test('repeated source positions keep the attributes of each instance', () => {
  const first = plan.job[0];
  const splitRow = first.slice();
  splitRow[3] = 1;
  const rows = [partRow(splitRow, ' А'), partRow(splitRow, ' Б'), ...sourceRows.slice(1)];
  const out = nativeOblOrder(Buffer.from([prefix, ...rows].join('\n'), 'utf16le'), plan, decode);
  assert.equal(out.charset, 'utf-16le');
  verifyOblFiles(out, plan, decode);
  for (const note of [' А', ' Б']) {
    const actual = out.sheets.flatMap(s => decode(out.charset, s.bytes).split('\n'));
    assert.equal(actual.filter(line => line === partRow(splitRow, note)).length, 1);
  }
});

test('changed decimal dimensions and damaged manufacturing attributes are detected', () => {
  const changed = source.replace('\t819\t779,5\t', '\t819\t779\t');
  assert.notEqual(changed, source);
  assert.throws(() => nativeOblOrder(Buffer.from(changed), plan, decode), /совпали/);
  const out = nativeOblOrder(Buffer.from(source), plan, decode);
  const sheet = out.sheets[1];
  sheet.bytes = Buffer.from(decode(out.charset, sheet.bytes).replace('Тестовая кромка', 'Повреждена'));
  assert.throws(() => verifyOblFiles(out, plan, decode), /реквизиты/);
});
