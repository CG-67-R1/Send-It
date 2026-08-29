import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

type DiagramId = 'steering' | 'antiSquat' | 'wheelRate';

const DIAGRAMS: { id: DiagramId; title: string; caption: string }[] = [
  {
    id: 'steering',
    title: 'Steering geometry',
    caption:
      'Rake is the steering-axis angle from vertical. Trail is the ground distance from where that axis hits the ground back to the front contact patch. Trail is the main stability number.',
  },
  {
    id: 'antiSquat',
    title: 'Anti-squat (IFC)',
    caption:
      'The squat line runs from the rear contact through the Instantaneous Force Centre (IFC), where the swingarm line meets the top chain run. Compare its angle to the load-transfer line from CoG height / wheelbase.',
  },
  {
    id: 'wheelRate',
    title: 'Wheel rate vs spring',
    caption:
      'Workshop springs act along the fork or shock. The tyre feels wheel rate: front Fw_rate = fork_rate / cos^2(rake); rear Rw_rate = shock_rate / link_ratio^2. Geometry can change wheel rate without changing the spring.',
  },
];

function SteeringDiagram() {
  return (
    <Svg width="100%" height={180} viewBox="0 0 320 180">
      <Rect x={0} y={0} width={320} height={180} fill="#0b1220" rx={8} />
      {/* Ground */}
      <Line x1={20} y1={150} x2={300} y2={150} stroke="#64748b" strokeWidth={2} />
      {/* Wheel */}
      <Circle cx={120} cy={120} r={30} stroke="#94a3b8" strokeWidth={3} fill="none" />
      <Circle cx={120} cy={120} r={3} fill="#f8fafc" />
      {/* Contact patch */}
      <Circle cx={120} cy={150} r={4} fill="#f59e0b" />
      <SvgText x={128} y={168} fill="#f59e0b" fontSize={10}>
        Contact
      </SvgText>
      {/* Steering axis */}
      <Line x1={95} y1={40} x2={128} y2={160} stroke="#38bdf8" strokeWidth={2.5} />
      <SvgText x={48} y={48} fill="#38bdf8" fontSize={11}>
        Steering axis
      </SvgText>
      {/* Ground intercept */}
      <Circle cx={128} cy={150} r={3.5} fill="#38bdf8" />
      {/* Trail bracket */}
      <Line x1={120} y1={156} x2={128} y2={156} stroke="#f59e0b" strokeWidth={2} />
      <SvgText x={112} y={178} fill="#f59e0b" fontSize={11}>
        Trail
      </SvgText>
      {/* Rake arc hint */}
      <Path d="M 120 70 A 28 28 0 0 0 108 88" stroke="#a78bfa" strokeWidth={2} fill="none" />
      <SvgText x={132} y={78} fill="#a78bfa" fontSize={11}>
        Rake
      </SvgText>
      {/* Vertical reference */}
      <Line
        x1={120}
        y1={50}
        x2={120}
        y2={150}
        stroke="#475569"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
    </Svg>
  );
}

function AntiSquatDiagram() {
  return (
    <Svg width="100%" height={180} viewBox="0 0 320 180">
      <Rect x={0} y={0} width={320} height={180} fill="#0b1220" rx={8} />
      <Line x1={20} y1={150} x2={300} y2={150} stroke="#64748b" strokeWidth={2} />
      {/* Rear wheel */}
      <Circle cx={240} cy={120} r={30} stroke="#94a3b8" strokeWidth={3} fill="none" />
      <Circle cx={240} cy={120} r={3} fill="#f8fafc" />
      <Circle cx={240} cy={150} r={4} fill="#f59e0b" />
      <SvgText x={248} y={168} fill="#f59e0b" fontSize={10}>
        Rear contact
      </SvgText>
      {/* Pivot */}
      <Circle cx={150} cy={95} r={5} fill="#e2e8f0" />
      <SvgText x={118} y={88} fill="#e2e8f0" fontSize={10}>
        Pivot
      </SvgText>
      {/* Swingarm line */}
      <Line x1={150} y1={95} x2={240} y2={120} stroke="#94a3b8" strokeWidth={2.5} />
      <SvgText x={165} y={118} fill="#94a3b8" fontSize={10}>
        Swingarm
      </SvgText>
      {/* Countershaft */}
      <Circle cx={130} cy={70} r={8} stroke="#38bdf8" strokeWidth={2} fill="none" />
      <SvgText x={70} y={62} fill="#38bdf8" fontSize={10}>
        CS sprocket
      </SvgText>
      {/* Top chain run */}
      <Line x1={136} y1={64} x2={248} y2={100} stroke="#38bdf8" strokeWidth={2} />
      <SvgText x={170} y={72} fill="#38bdf8" fontSize={10}>
        Top chain
      </SvgText>
      {/* IFC */}
      <Circle cx={100} cy={78} r={5} fill="#f472b6" />
      <SvgText x={40} y={82} fill="#f472b6" fontSize={11} fontWeight="700">
        IFC
      </SvgText>
      {/* Squat line */}
      <Line
        x1={240}
        y1={150}
        x2={100}
        y2={78}
        stroke="#f472b6"
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      <SvgText x={145} y={140} fill="#f472b6" fontSize={10}>
        Squat line (AS angle)
      </SvgText>
      {/* Load transfer hint */}
      <Line
        x1={240}
        y1={150}
        x2={60}
        y2={110}
        stroke="#a78bfa"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <SvgText x={48} y={125} fill="#a78bfa" fontSize={10}>
        LT line (CoG h / WB)
      </SvgText>
    </Svg>
  );
}

function WheelRateDiagram() {
  return (
    <Svg width="100%" height={180} viewBox="0 0 320 180">
      <Rect x={0} y={0} width={320} height={180} fill="#0b1220" rx={8} />
      {/* Fork leg */}
      <Rect x={70} y={30} width={16} height={90} rx={3} fill="#334155" stroke="#94a3b8" />
      <SvgText x={50} y={24} fill="#94a3b8" fontSize={10}>
        Fork spring
      </SvgText>
      <Polygon points="78,30 70,42 86,42" fill="#f59e0b" />
      <SvgText x={92} y={40} fill="#f59e0b" fontSize={10}>
        along axis
      </SvgText>
      {/* Wheel */}
      <Circle cx={78} cy={140} r={28} stroke="#94a3b8" strokeWidth={3} fill="none" />
      <Line x1={78} y1={112} x2={78} y2={168} stroke="#38bdf8" strokeWidth={2} />
      <SvgText x={20} y={175} fill="#38bdf8" fontSize={10}>
        Vertical at tyre (Fw)
      </SvgText>
      {/* Arrow cos */}
      <Path d="M 110 80 Q 140 100 110 130" stroke="#a78bfa" strokeWidth={2} fill="none" />
      <SvgText x={145} y={108} fill="#a78bfa" fontSize={11}>
        / cos^2(rake)
      </SvgText>
      {/* Rear block */}
      <Rect x={210} y={50} width={18} height={50} rx={3} fill="#334155" stroke="#94a3b8" />
      <SvgText x={200} y={44} fill="#94a3b8" fontSize={10}>
        Shock
      </SvgText>
      <Line x1={219} y1={100} x2={250} y2={140} stroke="#94a3b8" strokeWidth={2} />
      <Circle cx={260} cy={145} r={22} stroke="#94a3b8" strokeWidth={3} fill="none" />
      <Line x1={260} y1={123} x2={260} y2={167} stroke="#38bdf8" strokeWidth={2} />
      <SvgText x={200} y={175} fill="#38bdf8" fontSize={10}>
        Rw / ratio^2
      </SvgText>
    </Svg>
  );
}

function DiagramBody({ id }: { id: DiagramId }) {
  if (id === 'steering') return <SteeringDiagram />;
  if (id === 'antiSquat') return <AntiSquatDiagram />;
  return <WheelRateDiagram />;
}

/** Interactive educational diagrams for Bike Balance Setup. */
export function BikeBalanceDiagramPanel() {
  const [active, setActive] = useState<DiagramId>('steering');
  const meta = DIAGRAMS.find((d) => d.id === active)!;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>How to read it</Text>
      <View style={styles.chips}>
        {DIAGRAMS.map((d) => {
          const isActive = d.id === active;
          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.chip, isActive && styles.chipOn]}
              onPress={() => setActive(d.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextOn]}>{d.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <DiagramBody id={active} />
      <Text style={styles.caption}>{meta.caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    paddingBottom: 4,
  },
  heading: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  chipOn: {
    borderColor: '#f59e0b',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextOn: {
    color: '#f8fafc',
  },
  caption: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
});
