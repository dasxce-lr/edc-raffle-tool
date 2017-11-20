import { NgModule} from '@angular/core';
import {HomeComponent} from './home.component';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { PopoverModule } from 'ng2-pop-over';
import { SlotConfirmationModalComponent } from './slot-confirmation.modal.component';
import { RafflePickerModalComponent } from './raffle-picker.modal.component';
import { TermsOfServiceModalComponent } from './terms-of-service.modal.component';
import { TimeAgoPipe } from 'time-ago-pipe';
import {SharedModule} from '../shared/shared.module';
import {AsyncPipe, CommonModule} from "@angular/common";
import {ModChatModule} from "../mod-chat/mod-chat.module";
import {ModChatComponent} from "../mod-chat/mod-chat.component";

@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        HttpModule,
        PopoverModule,
    SharedModule],
    declarations: [HomeComponent, SlotConfirmationModalComponent, RafflePickerModalComponent, TermsOfServiceModalComponent],
    exports: [HomeComponent],
    entryComponents: [SlotConfirmationModalComponent, RafflePickerModalComponent, TermsOfServiceModalComponent]
})
export class HomeModule { }
