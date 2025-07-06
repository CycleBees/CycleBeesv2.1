import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Step {
  id: string;
  title: string;
  icon: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepPress?: (stepIndex: number) => void;
  showStepNumbers?: boolean;
}

const { width } = Dimensions.get('window');

export default function StepIndicator({
  steps,
  currentStep,
  onStepPress,
  showStepNumbers = true
}: StepIndicatorProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnimations = useRef(steps.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: currentStep / (steps.length - 1),
      duration: 400,
      useNativeDriver: false,
    }).start();

    // Animate current step
    stepAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === currentStep ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep, steps.length]);

  const renderStep = (step: Step, index: number) => {
    const isCompleted = index < currentStep;
    const isCurrent = index === currentStep;
    const isUpcoming = index > currentStep;

    return (
      <Animated.View
        key={step.id}
        style={[
          styles.stepContainer,
          {
            transform: [
              {
                scale: stepAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.stepButton,
            isCompleted && styles.stepCompleted,
            isCurrent && styles.stepCurrent,
            isUpcoming && styles.stepUpcoming,
          ]}
          onPress={() => onStepPress?.(index)}
          disabled={!onStepPress}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          ) : (
            <Ionicons name={step.icon as any} size={20} color={isCurrent ? "#FFD11E" : "#6C757D"} />
          )}
        </TouchableOpacity>
        
        <Text
          style={[
            styles.stepTitle,
            isCompleted && styles.stepTitleCompleted,
            isCurrent && styles.stepTitleCurrent,
            isUpcoming && styles.stepTitleUpcoming,
          ]}
        >
          {step.title}
        </Text>
        
        {showStepNumbers && (
          <Text
            style={[
              styles.stepNumber,
              isCompleted && styles.stepNumberCompleted,
              isCurrent && styles.stepNumberCurrent,
              isUpcoming && styles.stepNumberUpcoming,
            ]}
          >
            {index + 1}
          </Text>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {renderStep(step, index)}
            {index < steps.length - 1 && (
              <View style={styles.connectorContainer}>
                <View style={styles.connector} />
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    backgroundColor: '#FFFFFF',
  },
  stepCompleted: {
    backgroundColor: '#28A745',
    borderColor: '#28A745',
  },
  stepCurrent: {
    backgroundColor: '#FFF5CC',
    borderColor: '#FFD11E',
  },
  stepUpcoming: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepTitleCompleted: {
    color: '#28A745',
  },
  stepTitleCurrent: {
    color: '#2D3E50',
  },
  stepTitleUpcoming: {
    color: '#6C757D',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6C757D',
  },
  stepNumberCompleted: {
    color: '#28A745',
  },
  stepNumberCurrent: {
    color: '#FFD11E',
  },
  stepNumberUpcoming: {
    color: '#6C757D',
  },
  connectorContainer: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    position: 'relative',
  },
  connector: {
    height: 2,
    backgroundColor: '#E9ECEF',
    borderRadius: 1,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    backgroundColor: '#FFD11E',
    borderRadius: 1,
  },
}); 