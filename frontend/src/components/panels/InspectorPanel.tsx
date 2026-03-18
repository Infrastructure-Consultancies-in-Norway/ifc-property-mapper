/**
 * InspectorPanel – edit the selected node's data fields.
 *
 * Features:
 * - Property field is a dropdown filtered to properties in the selected PSet
 *   (falls back to free-text when no IFC is loaded or pset has no known props)
 * - Tooltip [?] buttons on every label explain what the field does
 */

import { useState } from 'react';
import { useStore } from '../../store';
import type { FilterOperator, CastTarget } from '../../types';

// ---------------------------------------------------------------------------
// Tooltip component
// ---------------------------------------------------------------------------

function Tip({ text }: { text: string }) {
  return (
    <span className="tip" title={text} aria-label={text}>
      ?
    </span>
  );
}

// ---------------------------------------------------------------------------
// Node-type descriptions (shown at the top of the inspector)
// ---------------------------------------------------------------------------

const NODE_DESCRIPTIONS: Record<string, string> = {
  SourceProperty:
    'Reads a single property value from a PSet on every matching IFC element. ' +
    'Connect its output to a transform node or directly to a Target Property.',
  TargetProperty:
    'Writes the incoming value into a PSet property on every matching IFC element. ' +
    'The PSet is created automatically if it does not exist (unless disabled in Run options).',
  SourceProperties:
    'Reads multiple properties from a single PSet. Each property gets its own output handle. ' +
    'Connect individual outputs to transform nodes or Target Properties.',
  TargetProperties:
    'Writes values into multiple properties within a single PSet. Each property gets its own input handle. ' +
    'The PSet is created automatically if it does not exist (unless disabled in Run options).',
  Filter:
    'Gates elements through: only elements that match the IFC class and/or property ' +
    'condition will flow downstream. Connect before any Source Property to scope the mapping.',
  Concat:
    'Joins multiple upstream string values with a delimiter (e.g. space or " – "). ' +
    'Add extra inputs by increasing the Inputs count, then connect one edge per slot.',
  Split:
    'Splits a string by a delimiter and emits the part at the chosen index (0-based). ' +
    'Useful for extracting the first word, a code prefix, etc.',
  Cast:
    'Converts the incoming value to a different type: Text (string), Number (int/float), ' +
    'or Boolean (true for "true", "1", "yes", "ja", "sant").',
  Const:
    'Emits a fixed static string regardless of the element. ' +
    'Useful for stamping a constant tag or version number.',
  Preview:
    'Inspects sampled values after a run without writing anything to the IFC. ' +
    'Use Max Samples to control how many values are collected. ' +
    'Great for verifying your mapping before committing.',
};

// Field-level tooltip texts
const FIELD_TIPS: Record<string, string> = {
  ifc_class:
    'Restrict this node to a specific IFC class (e.g. IfcWall, IfcDoor). ' +
    'Leave blank to apply to all element types.',
  pset:
    'The Property Set name (e.g. Pset_WallCommon or BIM_Modellinfo). ' +
    'For Target nodes: type any name to create a new PSet, or pick an existing one from the list.',
  property:
    'The individual property name within the selected PSet. ' +
    'The dropdown is filtered to properties known for the chosen PSet.',
  value:
    'The static value to compare against when filtering, or the constant to emit.',
  delimiter:
    'The string used to join (Concat) or split (Split) values, e.g. " ", " – ", "/".',
  input_count:
    'How many upstream inputs this Concat node accepts (2–10). ' +
    'Each input requires one connected edge.',
  index:
    'Zero-based index of the part to emit after splitting. ' +
    '"Foo Bar Baz" split by " " at index 1 → "Bar".',
  targetType:
    'The data type to cast the value to before writing. ' +
    'Number and Boolean conversions are best-effort; failures produce null.',
  operator:
    'The comparison operator applied to the property value. ' +
    '"Exists" / "Not exists" ignore the value field.',
  label: 'A display label shown on the Preview node tile.',
  maxSamples:
    'Maximum number of values to collect and display in the Preview node. ' +
    'Higher values show more results but may slow down large IFC files. Default is 100.',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InspectorPanel() {
  const { selectedNodeId, nodes, updateNodeData, ifcClasses } = useStore();
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [addingPropProperty, setAddingPropProperty] = useState('');

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    return (
      <div className="panel panel--inspector">
        <h3 className="panel__title">Inspector</h3>
        <p className="inspector__empty">Select a node to inspect.</p>
      </div>
    );
  }

  const currentNode = node;
  const data = currentNode.data;

  // Build PSet option list from all classes in the IFC
  const allPsets = ifcClasses.flatMap((c) => c.psets.map((p) => p.name));
  const uniquePsets = [...new Set(allPsets)].sort();

  // Build property option list scoped to the currently-selected PSet
  const selectedPset = (data.pset as string) || '';
  const propertiesForPset: string[] = selectedPset
    ? [...new Set(
        ifcClasses.flatMap((c) =>
          c.psets
            .filter((p) => p.name === selectedPset)
            .flatMap((p) => p.properties)
        )
      )].sort()
    : [];

  // Is this a node that writes to the IFC (target)? If so, allow free-text PSet/property.
  const isTargetNode = currentNode.type === 'TargetProperty' || currentNode.type === 'TargetProperties';

  function update(key: string, value: unknown) {
    // When the PSet changes, reset the property selection
    if (key === 'pset') {
      updateNodeData(currentNode.id, { pset: value, property: '' });
    } else {
      updateNodeData(currentNode.id, { [key]: value });
    }
  }

  // ── Field renderers ────────────────────────────────────────────────────────

  function labelEl(label: string, tipKey?: string) {
    return (
      <span className="inspector__label">
        {label}
        {tipKey && FIELD_TIPS[tipKey] && <Tip text={FIELD_TIPS[tipKey]} />}
      </span>
    );
  }

  function textField(label: string, key: string) {
    return (
      <label className="inspector__field" key={key}>
        {labelEl(label, key)}
        <input
          type="text"
          className="inspector__input"
          value={(data[key] as string) ?? ''}
          onChange={(e) => update(key, e.target.value)}
          placeholder="—"
        />
      </label>
    );
  }

  function selectField(
    label: string,
    key: string,
    options: { value: string; label: string }[],
    placeholder = '— any —'
  ) {
    return (
      <label className="inspector__field" key={key}>
        {labelEl(label, key)}
        <select
          className="inspector__input"
          value={(data[key] as string) ?? ''}
          onChange={(e) => update(key, e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  /**
   * Combo field: free-text input backed by a <datalist> of known options.
   * The user can type any value OR pick from the suggestions.
   */
  function comboField(label: string, key: string, options: string[], placeholder = '') {
    const listId = `combo-${currentNode.id}-${key}`;
    return (
      <label className="inspector__field" key={key}>
        {labelEl(label, key)}
        <input
          type="text"
          className="inspector__input"
          list={listId}
          value={(data[key] as string) ?? ''}
          onChange={(e) => update(key, e.target.value)}
          placeholder={placeholder || '—'}
          autoComplete="off"
        />
        <datalist id={listId}>
          {options.map((o) => <option key={o} value={o} />)}
        </datalist>
      </label>
    );
  }

  /** Property field: dropdown when source/filter node, combo when target node */
  function propertyField() {
    const currentVal = (data.property as string) ?? '';

    // Target node → always allow free text (to create new properties)
    if (isTargetNode) {
      return comboField(
        'Property',
        'property',
        propertiesForPset,
        selectedPset ? 'Type or select property name' : 'Enter property name'
      );
    }

    if (propertiesForPset.length > 0) {
      // Include the current value even if it isn't in the list (typed manually before)
      const options = [...new Set([...propertiesForPset, ...(currentVal ? [currentVal] : [])])].sort();
      return (
        <label className="inspector__field" key="property">
          {labelEl('Property', 'property')}
          <select
            className="inspector__input"
            value={currentVal}
            onChange={(e) => update('property', e.target.value)}
          >
            <option value="">— select property —</option>
            {options.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      );
    }
    // No IFC loaded yet or unknown pset → free text
    return (
      <label className="inspector__field" key="property">
        {labelEl('Property', 'property')}
        <input
          type="text"
          className="inspector__input"
          value={currentVal}
          onChange={(e) => update('property', e.target.value)}
          placeholder={selectedPset ? 'Type property name' : 'Select a PSet first'}
        />
      </label>
    );
  }

  const ifcClassOptions = ifcClasses.map((c) => ({ value: c.ifcClass, label: c.ifcClass }));
  const psetSelectOptions = uniquePsets.map((p) => ({ value: p, label: p }));

  // ── Node-specific field groups ─────────────────────────────────────────────

  function renderFields() {
    switch (currentNode.type) {
      case 'SourceProperty':
        return (
          <>
            {selectField('IFC Class', 'ifc_class', ifcClassOptions)}
            {selectField('PSet', 'pset', psetSelectOptions, '— select PSet —')}
            {propertyField()}
          </>
        );

      case 'TargetProperty':
        return (
          <>
            {selectField('IFC Class', 'ifc_class', ifcClassOptions)}
            {comboField('PSet', 'pset', uniquePsets, 'PSet name (new or existing)')}
            {propertyField()}
          </>
        );

      case 'SourceProperties': {
        const properties = (data.properties as string[]) ?? [];
        const psetVal = (data.pset as string) || '';

        // Properties available for the chosen PSet
        const propsForPset: string[] = psetVal
          ? [...new Set(
              ifcClasses.flatMap((c) =>
                c.psets
                  .filter((p) => p.name === psetVal)
                  .flatMap((p) => p.properties)
              )
            )].sort()
          : [];

        function cancelAdd() {
          setIsAddingProp(false);
          setAddingPropProperty('');
        }

        function confirmAdd() {
          if (!addingPropProperty) return;
          updateNodeData(currentNode.id, {
            properties: [...properties, addingPropProperty],
          });
          cancelAdd();
        }

        return (
          <>
            {selectField('IFC Class', 'ifc_class', ifcClassOptions)}
            {selectField('PSet', 'pset', psetSelectOptions, '— select PSet —')}
            <div className="inspector__field">
              <span className="inspector__label">Properties</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {properties.map((prop, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '11px', alignItems: 'center' }}>
                    <span style={{ flex: 1, color: '#a0aec0' }}>{prop}</span>
                    <button
                      className="btn btn--ghost"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                      onClick={() => {
                        updateNodeData(currentNode.id, {
                          properties: properties.filter((_, idx) => idx !== i),
                        });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {!isAddingProp ? (
                  <button
                    className="btn btn--primary"
                    style={{ marginTop: '4px', padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => { setIsAddingProp(true); setAddingPropProperty(''); }}
                  >
                    Add Property
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', backgroundColor: '#1a202c', borderRadius: '3px', fontSize: '11px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: '#a0aec0' }}>Property</span>
                      {propsForPset.length > 0 ? (
                        <select
                          className="inspector__input"
                          value={addingPropProperty}
                          onChange={(e) => setAddingPropProperty(e.target.value)}
                          style={{ fontSize: '11px' }}
                          autoFocus
                        >
                          <option value="">— select property —</option>
                          {propsForPset.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="inspector__input"
                          value={addingPropProperty}
                          onChange={(e) => setAddingPropProperty(e.target.value)}
                          placeholder={psetVal ? 'Type property name' : 'Select a PSet first'}
                          style={{ fontSize: '11px' }}
                          autoFocus
                        />
                      )}
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn--primary"
                        style={{ flex: 1, padding: '4px', fontSize: '10px' }}
                        onClick={confirmAdd}
                      >
                        Add
                      </button>
                      <button
                        className="btn btn--ghost"
                        style={{ flex: 1, padding: '4px', fontSize: '10px' }}
                        onClick={cancelAdd}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      }

      case 'TargetProperties': {
        const properties = (data.properties as string[]) ?? [];
        const psetVal = (data.pset as string) || '';

        const propsForPset: string[] = psetVal
          ? [...new Set(
              ifcClasses.flatMap((c) =>
                c.psets
                  .filter((p) => p.name === psetVal)
                  .flatMap((p) => p.properties)
              )
            )].sort()
          : [];
        const addPropListId = `target-props-add-${currentNode.id}`;

        function cancelAddT() {
          setIsAddingProp(false);
          setAddingPropProperty('');
        }

        function confirmAddT() {
          if (!addingPropProperty) return;
          updateNodeData(currentNode.id, {
            properties: [...properties, addingPropProperty],
          });
          cancelAddT();
        }

        return (
          <>
            {selectField('IFC Class', 'ifc_class', ifcClassOptions)}
            {comboField('PSet', 'pset', uniquePsets, 'PSet name (new or existing)')}
            <div className="inspector__field">
              <span className="inspector__label">Properties</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {properties.map((prop, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '11px', alignItems: 'center' }}>
                    <span style={{ flex: 1, color: '#a0aec0' }}>{prop}</span>
                    <button
                      className="btn btn--ghost"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                      onClick={() => {
                        updateNodeData(currentNode.id, {
                          properties: properties.filter((_, idx) => idx !== i),
                        });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {!isAddingProp ? (
                  <button
                    className="btn btn--primary"
                    style={{ marginTop: '4px', padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => { setIsAddingProp(true); setAddingPropProperty(''); }}
                  >
                    Add Property
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', backgroundColor: '#1a202c', borderRadius: '3px', fontSize: '11px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: '#a0aec0' }}>Property</span>
                      <input
                        type="text"
                        className="inspector__input"
                        list={addPropListId}
                        value={addingPropProperty}
                        onChange={(e) => setAddingPropProperty(e.target.value)}
                        placeholder="Property name"
                        style={{ fontSize: '11px' }}
                        autoFocus
                      />
                      <datalist id={addPropListId}>
                        {propsForPset.map((p) => <option key={p} value={p} />)}
                      </datalist>
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn--primary"
                        style={{ flex: 1, padding: '4px', fontSize: '10px' }}
                        onClick={confirmAddT}
                      >
                        Add
                      </button>
                      <button
                        className="btn btn--ghost"
                        style={{ flex: 1, padding: '4px', fontSize: '10px' }}
                        onClick={cancelAddT}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      }

      case 'Const':
        return textField('Value', 'value');

      case 'Concat':
        return (
          <>
            {textField('Delimiter', 'delimiter')}
            <label className="inspector__field">
              {labelEl('Inputs', 'input_count')}
              <input
                type="number"
                className="inspector__input"
                min={2}
                max={10}
                value={(data.input_count as number) ?? 2}
                onChange={(e) => update('input_count', parseInt(e.target.value, 10))}
              />
            </label>
          </>
        );

      case 'Split':
        return (
          <>
            {textField('Delimiter', 'delimiter')}
            <label className="inspector__field">
              {labelEl('Index', 'index')}
              <input
                type="number"
                className="inspector__input"
                min={0}
                value={(data.index as number) ?? 0}
                onChange={(e) => update('index', parseInt(e.target.value, 10))}
              />
            </label>
          </>
        );

      case 'Cast':
        return selectField('Target Type', 'targetType', [
          { value: 'text', label: 'Text (string)' },
          { value: 'number', label: 'Number (int / float)' },
          { value: 'bool', label: 'Boolean (true / false)' },
        ] as { value: CastTarget; label: string }[]);

      case 'Filter':
        return (
          <>
            {selectField('IFC Class', 'ifc_class', ifcClassOptions)}
            {selectField('PSet', 'pset', psetSelectOptions, '— select PSet —')}
            {propertyField()}
            {selectField('Operator', 'operator', [
              { value: 'exists', label: 'Exists' },
              { value: 'notExists', label: 'Not exists' },
              { value: 'equals', label: '= equals' },
              { value: 'notEquals', label: '≠ not equals' },
              { value: 'contains', label: 'Contains' },
              { value: 'notContains', label: 'Not contains' },
              { value: 'greaterThan', label: '> greater than' },
              { value: 'lessThan', label: '< less than' },
            ] as { value: FilterOperator; label: string }[])}
            {textField('Value', 'value')}
          </>
        );

      case 'Preview':
        return (
          <>
            {textField('Label', 'label')}
            <label className="inspector__field">
              {labelEl('Max Samples', 'maxSamples')}
              <input
                type="number"
                className="inspector__input"
                min={1}
                max={10000}
                value={(data.maxSamples as number) ?? 100}
                onChange={(e) => update('maxSamples', parseInt(e.target.value, 10) || 100)}
              />
            </label>
          </>
        );

      default:
        return <p className="inspector__empty">No editable fields.</p>;
    }
  }

  const description = NODE_DESCRIPTIONS[currentNode.type] ?? '';

  return (
    <div className="panel panel--inspector">
      <h3 className="panel__title">Inspector</h3>
      <div className="inspector__node-type">{currentNode.type}</div>
      {description && (
        <p className="inspector__description">{description}</p>
      )}
      <div className="inspector__fields">{renderFields()}</div>
    </div>
  );
}
