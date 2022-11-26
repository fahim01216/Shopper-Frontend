import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Route, Router } from '@angular/router';
import { Country } from 'src/app/common/country';
import { Order } from 'src/app/common/order';
import { OrderItem } from 'src/app/common/order-item';
import { PaymentInfo } from 'src/app/common/payment-info';
import { Purchase } from 'src/app/common/purchase';
import { State } from 'src/app/common/state';
import { CartService } from 'src/app/services/cart.service';
import { CheckoutService } from 'src/app/services/checkout.service';
import { ShopperFormService } from 'src/app/services/shopper-form.service';
import { ShopperValidators } from 'src/app/validators/shopper-validators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})

export class CheckoutComponent implements OnInit {

  // declare checkout form group
  checkoutFormGroup: FormGroup | any;

  totalPrice: number = 0;
  totalQuantity: number = 0;

  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  countries: Country[] = [];
  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];

  storage: Storage = sessionStorage;

  // Initialize the Stripe API
  stripe = Stripe(environment.stripePublishableKey);
  paymentInfo: PaymentInfo = new PaymentInfo();
  cardElement: any;
  displayError: any = "";

  isDisabled: boolean = false;

  constructor(private formBuilder: FormBuilder, 
              private cartService: CartService,
              private shopperFormService: ShopperFormService,
              private checkoutService: CheckoutService,
              private router: Router) { }

  ngOnInit(): void {

    // Setup Stripe payment form
    this.setupStripePaymentForm();

    this.reviewCartDetails();

    // read the email address from browser storage
    const theEmail = JSON.parse(this.storage.getItem('userEmail')!);

    // build the form
    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: new FormControl('', 
                                    [Validators.required, 
                                     Validators.minLength(2), 
                                     ShopperValidators.notOnlyWhiteSpace]),

        lastName: new FormControl('', 
                                  [Validators.required, 
                                   Validators.minLength(2),
                                   ShopperValidators.notOnlyWhiteSpace]),
        // [a-z0-9._%+-]+ match any combination of letters and digits, optional period
        // [a-z0-9.-]+\\. match any combination of letters and digits, with period
        // [a-z]{2,4}$ domain extention 2-4 letters
        email: new FormControl(theEmail, 
                                [Validators.required, 
                                 Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')])
      }),

      shippingAddress: this.formBuilder.group({
        street: new FormControl('', [Validators.required, Validators.minLength(2), 
                                     ShopperValidators.notOnlyWhiteSpace]),
        city: new FormControl('', [Validators.required, Validators.minLength(2), 
                                    ShopperValidators.notOnlyWhiteSpace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        pincode: new FormControl('', [Validators.required, Validators.minLength(2), 
                                      ShopperValidators.notOnlyWhiteSpace])
      }),

      billingAddress: this.formBuilder.group({
        street: new FormControl('', [Validators.required, Validators.minLength(2), 
                                      ShopperValidators.notOnlyWhiteSpace]),
        city: new FormControl('', [Validators.required, Validators.minLength(2), 
                                    ShopperValidators.notOnlyWhiteSpace]),
        state: new FormControl('', [Validators.required]),
        country: new FormControl('', [Validators.required]),
        pincode: new FormControl('', [Validators.required, Validators.minLength(2), 
                                      ShopperValidators.notOnlyWhiteSpace])
      }),

      // creditCard: this.formBuilder.group({

      // })
    });


    // populate countries
    this.shopperFormService.getCountries().subscribe(
      data => {
        console.log("Retreive countries " + JSON.stringify(data));
        this.countries = data;
      }
    );

  }

  
  setupStripePaymentForm() {
    
    // Get a handle to stripe elements
    var elements = this.stripe.elements();

    // Create a card element and hide the zip-code field
    this.cardElement = elements.create('card', { hidePostalCode: true });

    // Add an instance of card UI component into the 'card-element' div
    this.cardElement.mount('#card-element');

    // Add event binding for the 'change' event om the card element
    this.cardElement.on('change', (event: any) => {

      // Get a handle to card-errors element
      this.displayError = document.getElementById('card-errors');

      if(event.complete) {
        this.displayError.textContent = "";
      }
      else if(event.error) {
        // Show validation error to customer
        this.displayError.textContent = event.error.message;
      }

    });

  }

  get firstName() { return this.checkoutFormGroup.get('customer.firstName'); }
  get lastName() { return this.checkoutFormGroup.get('customer.lastName'); }
  get email() { return this.checkoutFormGroup.get('customer.email'); }

  get shippingAddressStreet() { return this.checkoutFormGroup.get('shippingAddress.street') };
  get shippingAddressCity() { return this.checkoutFormGroup.get('shippingAddress.city') };
  get shippingAddressState() { return this.checkoutFormGroup.get('shippingAddress.state') };
  get shippingAddressCountry() { return this.checkoutFormGroup.get('shippingAddress.country') };
  get shippingAddressPincode() { return this.checkoutFormGroup.get('shippingAddress.pincode') };

  get billingAddressStreet() { return this.checkoutFormGroup.get('billingAddress.street') };
  get billingAddressCity() { return this.checkoutFormGroup.get('billingAddress.city') };
  get billingAddressState() { return this.checkoutFormGroup.get('billingAddress.state') };
  get billingAddressCountry() { return this.checkoutFormGroup.get('billingAddress.country') };
  get billingAddressPincode() { return this.checkoutFormGroup.get('billingAddress.pincode') };

  get creditCardType() { return this.checkoutFormGroup.get('creditCard.cardType') };
  get creditCardNameOnCard() { return this.checkoutFormGroup.get('creditCard.nameOnCard') };
  get creditCardNumber() { return this.checkoutFormGroup.get('creditCard.cardNumber') };
  get creditCardSecurityCode() { return this.checkoutFormGroup.get('creditCard.securityCode') };

  copyShippingAddressToBillingAddress(event: any) {
    
    if(event.target.checked) {
      this.checkoutFormGroup.controls.billingAddress
          .setValue(this.checkoutFormGroup.controls.shippingAddress.value);

      // bug fix states
      this.billingAddressStates = this.shippingAddressStates;
    }
    else {
      this.checkoutFormGroup.controls.billingAddress.reset();

      // bug fix for states
      this.billingAddressStates = [];
    }
  }

  onSubmit() {
    console.log('Handling the submit button');

    // touching all fields triggers the display of the error messages
    if(this.checkoutFormGroup.invalid) {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }

    // set up order
    let order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;

    // get cart items
    const cartItems = this.cartService.cartItems;

    // create order items from cartItems
    let orderItems: OrderItem[] = cartItems.map(item => new OrderItem(item));

    // set up purchase
    let purchase = new Purchase();

    // populate purchase - customer
    purchase.customer = this.checkoutFormGroup.controls['customer'].value;

    // populate purchase - shipping address
    purchase.shippingAddress = this.checkoutFormGroup.controls['shippingAddress'].value;
    const shippingState: State = JSON.parse(JSON.stringify(purchase.shippingAddress?.state));
    const shippingCountry: Country = JSON.parse(JSON.stringify(purchase.shippingAddress?.country));

    purchase.shippingAddress!.state = shippingState.name;
    purchase.shippingAddress!.country = shippingCountry.name;

    // populate purchase - billing address
    purchase.billingAddress = this.checkoutFormGroup.controls['billingAddress'].value;
    const billingState: State = JSON.parse(JSON.stringify(purchase.billingAddress?.state));
    const billingCountry: Country = JSON.parse(JSON.stringify(purchase.billingAddress?.country));

    purchase.billingAddress!.state = billingState.name;
    purchase.billingAddress!.country = billingCountry.name;

    // populate purchase - order and orderItems
    purchase.order = order;
    purchase.orderItems = orderItems;


    // compute payment info
    this.paymentInfo.amount = this.totalPrice * 100;
    this.paymentInfo.currency = "INR";
    this.paymentInfo.receiptEmail = purchase.customer?.email;

    // if valid form then 
    // - create payment intent
    // - confirm card payment
    // - place order

    if(!this.checkoutFormGroup.invalid && this.displayError.textContent === "") {

      this.isDisabled = true;

      this.checkoutService.createPaymentIntent(this.paymentInfo).subscribe(
        (paymentIntentReponse) => {
          this.stripe.confirmCardPayment(paymentIntentReponse.client_secret,
            {
              payment_method: {
                card: this.cardElement,
                billing_details: {
                  email: purchase.customer?.email,
                  name: `${purchase.customer?.firstName} ${purchase.customer?.lastName}`,
                  address: {
                    line1: purchase.billingAddress?.street,
                    city: purchase.billingAddress?.city,
                    state: purchase.billingAddress?.state,
                    postal_code: purchase.billingAddress?.pincode,
                    country: this.billingAddressCountry.value.code
                  }
                }
              }
            }, { handleActions: false })
            .then((result: any) => {
              if(result.error) {
                // inform the customer there was an error
                alert(`There was an error: ${result.error.message}`);
                this.isDisabled = false;
              } else {
                // call the REST API CheckoutService
                this.checkoutService.placeOrder(purchase).subscribe({
                  next: (response: any) => {
                    alert(`Your order has been received.\n Order tracking number: ${response.orderTrackingNumber}`);

                    // reset the cart
                    this.resetCart();
                    this.isDisabled = false;
                  },
                  error: (err: any) => {
                    alert(`There was an error: ${err.message}`);
                    this.isDisabled = false;
                  }
                })
              }
            });
        }
      );
    } else {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }
  }

  resetCart() {
    
    // reset cart data
    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);

    // updates the storage with latest state of the cart
    this.cartService.persistCartItems();

    // reset the form 
    this.checkoutFormGroup.reset();

    // navigate back to the products page
    this.router.navigateByUrl("/products");
  }

  handleMonthsAndyears() {

    const creditCardFormGroup = this.checkoutFormGroup.get('creditCard');

    const currentYear: number = new Date().getFullYear();
    const selectedYear: number = Number(creditCardFormGroup.value.expirationYear);

    // if current year equals the selected year, then start with current month
    let startMonth: number;

    if(currentYear === selectedYear) {
      startMonth = new Date().getMonth() + 1;
    }
    else {
      startMonth = 1;
    }

    this.shopperFormService.getCreditCardMonths(startMonth).subscribe(
      data => {
        console.log('Retreive credit card months: ' + JSON.stringify(data));
        this.creditCardMonths = data;
      }
    );
  }

  getStates(formGroupName: string) {

    const formGroup = this.checkoutFormGroup.get(formGroupName);

    const countryCode = formGroup.value.country.code;
    const countryName = formGroup.value.country.name;

    console.log(`${formGroupName} country code: ${countryCode}`);
    console.log(`${formGroupName} country name: ${countryName}`);

    this.shopperFormService.getStates(countryCode).subscribe(
      data => {

        if(formGroupName === 'shippingAddress') {
          this.shippingAddressStates = data;
        }
        else {
          this.billingAddressStates = data;
        }

        //select first item by default
        formGroup.get('state').setValue(data[0]);
      }
    );
  }

  reviewCartDetails() {

    // subscribe to cartService.totalPrice
    this.cartService.totalPrice.subscribe(
      data => {
        this.totalPrice = data;
      }
    );

    // subscribe to cartService.totalQuantity
    this.cartService.totalQuantity.subscribe(
      data => {
        this.totalQuantity = data;
      }
    );
  }

}
