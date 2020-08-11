class LinkedList {
    constructor() {
        this.head = null;
        this.size = 0;
    }
    push(obj) {
        var el = new Element(obj, null, this.head);
        if (this.head != null){
            this.head.prev = el;
        }
        this.head = el;
        this.size ++;
    }
    clear() {
        var cur = this.head;
        while(cur != null){
            this.remove(cur);
            cur = cur.next;
        }
        this.size = 0;
    }

    remove(element){
        if (element.prev != null){
            element.prev.next = element.next;
        }
        else if (this.head == element){
            this.head = element.next;
        }
        if (element.next != null){
            element.next.prev = element.prev;
        }
        this.size--;
    }
}

class Element {
    constructor(obj, prev, next){
        this.obj = obj;
        this.prev = prev;
        this.next = next;
    }
}