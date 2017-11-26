import {Component, ElementRef, EventEmitter, Input, Output, OnInit, ViewChild} from '@angular/core';
import {AngularFireDatabase, AngularFireList} from 'angularfire2/database';
import {Observable} from 'rxjs/Observable';

import jQuery from 'jQuery';

@Component({
    selector: 'app-mod-chat',
    templateUrl: './mod-chat.component.html',
    styleUrls: ['./mod-chat.component.css']
})
export class ModChatComponent implements OnInit {
    @ViewChild('chatScroll') private myScrollContainer: ElementRef;

    @Output() messageEventEmitter = new EventEmitter();

    @Input() modToolsId = '';
    @Input() username = '';
    @Input() userRole = 'MOD';

    private chatMessagesRef: AngularFireList<any>;
    private chatMessages: Observable<any[]>;
    private msgVal = '';
    private showNewMessageText = false;

    constructor(private afdb: AngularFireDatabase) {
    }

    ngOnInit() {
        this.chatMessagesRef = this.afdb.list('/mod_tools/' + this.modToolsId + '/messages');
        this.chatMessages = this.chatMessagesRef.valueChanges();
        this.chatMessages.subscribe(updatedMessages => {
            this.messageEventEmitter.emit(updatedMessages);

            setTimeout(() => {
                this.scrollToBottom();
            }, 250);

            if (jQuery('#collapseOne').attr('aria-expanded') === 'false') {
                this.showNewMessageText = true;
            }
        });
    }

    private scrollToBottom() {
        let panel: any = document.getElementsByName('chatBody')[0];

        if (panel) {
            panel.scrollTop = panel.scrollHeight;
        }
    }

    private chatSend(message: string) {
        if (message) {
            this.chatMessagesRef.push({message: message, username: this.username, userRole: this.userRole, timeSent: Date.now()});
            this.msgVal = '';
        }
    }

    private updateUsername(updatedUsername: string) {
        if (updatedUsername) {
            this.username = updatedUsername;
            setTimeout(() => {
                this.scrollToBottom();
            }, 250);
        }
    }

    private collapse() {
        this.showNewMessageText = false;

        setTimeout(() => {
            this.scrollToBottom();
        }, 250);

    }

}
