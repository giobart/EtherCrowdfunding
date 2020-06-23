// SPDX-License-Identifier: GPL-3.0-or-later
/** 
Just an ordered Linked list data structure 
*/

pragma solidity >=0.6.0 <0.7.0;

library AscendingOrderedStack
{
    uint256 constant UINT256_MAX = ~uint256(0);

    struct Elem
    {
        uint prec;
        uint pos;
        uint next;
        uint value;
        uint amount;
    }

    struct ordered_stack
    {
        Elem[] list_memory;
        uint head_pos;
        uint tot;
        uint deleted;
    }

    function init_stack(ordered_stack storage self) public
    {
        self.head_pos=UINT256_MAX;
    }

    function add_elem(ordered_stack storage self, uint _value, uint _amount) public
    {
        //if list empty
        self.tot++;
        uint mem_size = self.list_memory.length;
        if(self.head_pos==UINT256_MAX){
            //create a new head
            self.head_pos = mem_size;
            self.list_memory.push(Elem(UINT256_MAX,mem_size,UINT256_MAX,_value,_amount));
            return;
        }

        //if elem smaller than head
        if(_value<=self.list_memory[self.head_pos].value)
        {
            //insert the new head
            self.list_memory.push(Elem(UINT256_MAX,mem_size,self.head_pos,_value,_amount));
            //update prec of the old head
            self.list_memory[self.head_pos].prec=mem_size;
            //update head pos
            self.head_pos = mem_size;
            return;  
        }
        
        //find the place
        uint prec_pos = self.head_pos;
        uint curr_pos = self.list_memory[self.head_pos].next;
        Elem memory curr;
        while(curr_pos!=UINT256_MAX)
        {
            curr = self.list_memory[curr_pos];
            if(curr.value>_value)
            {
                //update memory with the new element
                self.list_memory.push(Elem(curr.prec,mem_size,curr.pos,_value,_amount));
                //update prec 
                self.list_memory[curr.prec].next=mem_size;
                //update curr 
                self.list_memory[curr.pos].prec=mem_size;
                return;
            }
            //update prec and curr
            prec_pos=curr.pos;
            curr_pos=curr.next;
        }  
        //in this case the elem is in the queue
        //update prec next
        self.list_memory[prec_pos].next=mem_size;
        //push new elem
        self.list_memory.push(Elem(prec_pos,mem_size,UINT256_MAX,_value,_amount));
    }

    function pop_head(ordered_stack storage self) public
    {
        self.deleted++;
        self.head_pos = self.list_memory[self.head_pos].next;
        if(self.head_pos!=UINT256_MAX)
        {
           self.list_memory[self.head_pos].prec=UINT256_MAX; 
        }
    }

    function to_array(ordered_stack storage self) public view returns (uint[] memory _value, uint[] memory _amount)
    {
        _value = new uint[](self.tot-self.deleted);
        _amount = new uint[](self.tot-self.deleted);
        Elem memory curr;
        uint next_index = self.head_pos;
        uint i = 0;
        while(next_index!=UINT256_MAX)
        {
            curr = self.list_memory[next_index];
            _value[i]=curr.value;
            _amount[i]=curr.amount;
            next_index=curr.next;
            i++;
        }
    }

}