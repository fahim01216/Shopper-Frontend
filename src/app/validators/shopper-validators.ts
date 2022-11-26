import { FormControl, ValidationErrors } from "@angular/forms";

export class ShopperValidators {

    // whitespace validation
    static notOnlyWhiteSpace(control: FormControl): ValidationErrors {

        // check if string only contains whitespace
        if((control.value != null) && (control.value.trim().length === 0)) {

            // invalid return error object
            return { 'notOnlyWhiteSpace': true };
        }
        else {
            // valid, return null
            // handling error 'null' is not assignable to type 'ValidationErrors
            return null as any;
        }
    }
}
