import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';

const RUL_32_64_FRACTIONAL = /^(-?\d+[-,‘,',`]\d{1,2}((\+|\d)|( [1-7]\/[4,8]))?)|(-\(\d+[-,‘,']\d{1,2}((\+|\d)|( [1-7]\/[4,8]))?\))$/;

function roundHalf(num: number) {
  return Math.round(num * 2) / 2;
}

function round8s(num: number) {
  return Math.round(num * 8) / 8;
}

function round4s(num: number) {
  return Math.round(num * 4) / 4;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public formGroup: FormGroup;

  public formattedValue!: number;

  public fractionFormGroup: FormGroup;

  public fractionFormattedValue!: string;

  constructor(
    private readonly fb: FormBuilder
  ) {
    this.fractionFormGroup = this.fb.group({
      value: [, Validators.required],
      decimalValue: [, Validators.required],
      hasFractional: [false, Validators.required],
    })

    this.formGroup = this.fb.group({
      is64: [true],
      fractions: ['', [Validators.required, this.isValid32And64RuleValue]]
    })

    this.formGroup.valueChanges.subscribe(({ fractions, is64}) => {
      const decimalValue = !is64 ? '32ths' : '64ths';

      this.formattedValue = this.format32And64ToRealValue(fractions, decimalValue);
    })

    this.fractionFormGroup.valueChanges.subscribe(({
      value,
      decimalValue,
      hasFractional,
    }) => {
      this.fractionFormattedValue = this.get32And64Calculation(value, decimalValue, hasFractional)
    })
  }

  private isValid32And64RuleValue(control: FormControl): ValidationErrors | null {
    const value = control?.value;
    return {
      isValid: value.match(RUL_32_64_FRACTIONAL)?.[0] === value
    }
  }

  private format32And64ToRealValue(value: string, decimalValue: string) {
    console.log(">>> value: ", value);
    const withoutBrackets = value.replace(/[()+]/g, '');
    const splitted = withoutBrackets.split(/[-‘'`]/g);
    const isMinus = splitted.length === 3;
    const hasPlus = value.indexOf('+') !== -1;
    const firstPart = parseInt(splitted[isMinus ? 1 : 0], 10);

    const [secondPart, fractional] = splitted[splitted.length - 1].split(' ');

    let secondPartNormalized = parseFloat(secondPart.length === 1
      ? `${secondPart}0`
      : secondPart.length === 3
        ? secondPart.slice(0, 2)
        : secondPart);
    if (hasPlus) {
      secondPartNormalized += 0.5;
    } else if (secondPart.length === 3) {
      secondPartNormalized += +secondPart[2] / 10;
    } else if (fractional) {
      const [first, second] = fractional.split('/');
      secondPartNormalized += +first / +second;
    }

    const fraction = secondPartNormalized / (decimalValue === '64ths' ? 64 : 32);

    const result = firstPart + fraction;
    return isMinus ? 0 - result : result;
  }

  private get32And64Calculation(
    val: any,
    decimalValue: string | number,
    hasFractional?: string,
  ) {
    const modulus = Math.abs(val);
    const isMinus = val < 0;
    const wholeNumber = Math.floor(modulus);

    const valueToRound = (modulus - wholeNumber) * (decimalValue === '64ths' ? 64 : 32);
    const suffix = hasFractional ?
      hasFractional === '1/8'
        ? round8s(valueToRound)
        : round4s(valueToRound)
      : roundHalf(valueToRound);
    const suffixWholeNumber = Math.floor(suffix);
    const suffixFraction = suffix - suffixWholeNumber;

    let suffixEnding = '';
    if (suffixFraction !== 0) {
      if (suffixFraction === 0.5) {
        suffixEnding = '+';
      } else {
        const first = suffixFraction === 0.125 || suffixFraction === 0.25
          ? 1
          : suffixFraction === 0.375 || suffixFraction === 0.75
            ? 3
            : suffixFraction === 0.625
              ? 5
              : 7;
        const second = suffixFraction === 0.25 || suffixFraction === 0.75
          ? 4
          : 8;
        suffixEnding = ` ${first}/${second}`;
      }
    }

    const secondPart = `${('' + suffixWholeNumber).length === 1 ? '0' : ''}${suffixWholeNumber}${suffixEnding}`;

    const result = `${wholeNumber}-${secondPart}`;
    return isMinus
      ? `-(${result})`
      : result;
  }
}
