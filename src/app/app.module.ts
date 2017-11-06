import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { PopoverModule } from 'ng2-pop-over';
import { ModalModule } from 'ngx-modialog';
import { BootstrapModalModule } from 'ngx-modialog/plugins/bootstrap';

import { OauthService} from './oauth/services/oauth.service';

import {routing} from './app.routes';

import {HomeModule} from './home/home.module';

import { AppComponent } from './app.component';
import {RedditService} from './reddit/services/reddit.service';
import {DatabaseService} from './database/services/database.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    routing,
    HomeModule,
      PopoverModule,
      ModalModule.forRoot(),
      BootstrapModalModule
  ],
  providers: [OauthService, RedditService, DatabaseService],
  bootstrap: [AppComponent]
})
export class AppModule { }
