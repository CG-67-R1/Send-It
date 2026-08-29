import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  DATA_GUIDE_STEPS,
  R6_2020_PUBLIC_CHASSIS,
  getDataGuideProgress,
  getStepProgress,
  type BikeBalanceInputs,
} from '../../calc/bikeBalance';

type Props = {
  inputs: BikeBalanceInputs;
  onLoadR6Shell: () => void;
  onGoToStepFields: (fieldKeys: string[]) => void;
  onClose?: () => void;
};

/** First-time / on-demand guide for gathering Bike Balance inputs, with R6 example. */
export function BikeBalanceDataGuide({
  inputs,
  onLoadR6Shell,
  onGoToStepFields,
  onClose,
}: Props) {
  const progress = useMemo(() => getDataGuideProgress(inputs), [inputs]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>R6 data-gathering guide</Text>
        {onClose ? (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.link}>Hide</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.intro}>
        Work top to bottom. Only fill numbers you can defend. Empty is better than a guess. The
        calculator will say Needs input instead of inventing values.
      </Text>
      <Text style={styles.progressLine}>
        Progress: {progress.completeCount} of {progress.totalSteps} steps have usable data
      </Text>

      <View style={styles.r6Box}>
        <Text style={styles.r6Title}>{R6_2020_PUBLIC_CHASSIS.model}: public stock specs</Text>
        <Text style={styles.r6Line}>
          Rake {R6_2020_PUBLIC_CHASSIS.rakeDeg} deg, trail {R6_2020_PUBLIC_CHASSIS.trailMm} mm,
          wheelbase {R6_2020_PUBLIC_CHASSIS.wheelbaseMm} mm
        </Text>
        <Text style={styles.r6Line}>
          Tyres {R6_2020_PUBLIC_CHASSIS.frontTyre} / {R6_2020_PUBLIC_CHASSIS.rearTyre}, seat{' '}
          {R6_2020_PUBLIC_CHASSIS.seatHeightMm} mm, wet weight about{' '}
          {R6_2020_PUBLIC_CHASSIS.wetWeightKg} kg
        </Text>
        <Text style={styles.r6Line}>
          Published total stroke capacity about{' '}
          {R6_2020_PUBLIC_CHASSIS.publishedFrontTravelCapacityMm} mm front /{' '}
          {R6_2020_PUBLIC_CHASSIS.publishedRearTravelCapacityMm} mm rear (not used travel at a
          position)
        </Text>
        <Text style={styles.r6Note}>{R6_2020_PUBLIC_CHASSIS.notes[0]}</Text>
        <Text style={styles.r6Note}>{R6_2020_PUBLIC_CHASSIS.notes[2]}</Text>
        <TouchableOpacity style={styles.r6Btn} onPress={onLoadR6Shell} activeOpacity={0.85}>
          <Text style={styles.r6BtnText}>Load R6 public chassis into Inputs</Text>
        </TouchableOpacity>
        <Text style={styles.source}>{R6_2020_PUBLIC_CHASSIS.sources[0]}</Text>
      </View>

      {DATA_GUIDE_STEPS.map((step) => {
        const stepProg = getStepProgress(step, inputs);
        return (
          <View key={step.id} style={[styles.step, stepProg.complete && styles.stepDone]}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={stepProg.complete ? styles.badgeDone : styles.badgeTodo}>
                {stepProg.complete
                  ? 'Ready'
                  : `${stepProg.filled}/${stepProg.total}`}
              </Text>
            </View>
            <Text style={styles.label}>Why</Text>
            <Text style={styles.text}>{step.why}</Text>
            <Text style={styles.label}>How</Text>
            <Text style={styles.text}>{step.how}</Text>
            {step.r6Example ? (
              <>
                <Text style={styles.label}>R6 example</Text>
                <Text style={styles.text}>{step.r6Example}</Text>
              </>
            ) : null}
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => onGoToStepFields(step.fieldHints as string[])}
              activeOpacity={0.85}
            >
              <Text style={styles.stepBtnText}>
                {stepProg.complete ? 'Review these inputs' : 'Fill these inputs'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heading: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  link: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  intro: { color: '#94a3b8', fontSize: 13, lineHeight: 19, marginBottom: 8 },
  progressLine: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  r6Box: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 14,
  },
  r6Title: { color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  r6Line: { color: '#e2e8f0', fontSize: 13, lineHeight: 19 },
  r6Note: { color: '#fbbf24', fontSize: 12, lineHeight: 17, marginTop: 8 },
  r6Btn: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  r6BtnText: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
  source: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 10 },
  step: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 10,
  },
  stepDone: {
    borderColor: '#166534',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  stepTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700', flex: 1 },
  badgeTodo: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeDone: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  text: { color: '#cbd5e1', fontSize: 13, lineHeight: 19, marginTop: 2 },
  stepBtn: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 10,
    alignItems: 'center',
  },
  stepBtnText: { color: '#38bdf8', fontWeight: '700', fontSize: 13 },
});
